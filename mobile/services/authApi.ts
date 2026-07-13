/**
 * services/authApi.ts — 소셜 로그인 순수 함수 (React 비의존) · login-workflow.md §6.2
 *
 * Apple은 Apple Developer 멤버십 미보유로 이번 사이클 스코프 밖(문서 상단 [2026-07-12]
 * 스코프 축소 노트 참고) — getAppleIdToken 은 명시적으로 미구현 에러를 던진다. expo-apple-
 * authentication 은 아직 설치하지 않았으므로 여기서 import 하지 않는다(빌드 안 깨지게).
 *
 * ── 충돌 처리 설계(§2.3) ────────────────────────────────────────────────────────
 * "충돌 시 경고 후 기존 계정 로그인"을 linkOrSignIn 안에서 자동으로 처리하지 않고 2단계로
 * 나눈다 — §7 Phase 1 프롬프트의 "충돌 시 경고는 호출부(UI)가 하도록 에러를 명확히 반환"
 * 요구사항 그대로:
 *   1) linkOrSignIn() 이 충돌(식별자가 이미 다른 유저에 연결됨, Supabase 에러 코드
 *      'identity_already_exists')을 만나면 예외를 던지지 않고 { kind: 'conflict' } 를
 *      반환한다 — 호출부가 "임시 데이터 승계 안 됨" 경고를 사용자에게 보여줄 기회를 준다.
 *   2) 사용자가 경고를 확인하면 confirmConflictSignIn() 을 별도로 호출해 그제서야
 *      signInWithIdToken 으로 기존 계정에 로그인한다(§3.2 "파국 경로" — 현재 익명 uid의
 *      로컬 데이터는 이 시점부터 승계되지 않음, 그래서 자동 진행하지 않는다).
 *
 * Google 네이티브 idToken 은 Skip-nonce-checks(Supabase 대시보드)가 켜진 상태를 전제로
 * nonce 없이 발급한다(Phase 0에서 실기로 검증된 제약 — @react-native-google-signin 의
 * "Original" iOS API가 커스텀 nonce를 노출하지 않음, work-log §10.2).
 *
 * 스택: supabase-js(확정) + @react-native-google-signin/google-signin(Phase 0 승인·설치됨).
 * 새 라이브러리 없음.
 */
import { Platform } from 'react-native';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { supabase, ensureAnonymousSession } from '@/lib/supabase';

export type SocialProvider = 'google' | 'apple';

export interface IdTokenCredentials {
  token: string;
  nonce?: string;
}

/** getGoogleIdToken 이 함께 돌려주는 표시용 프로필 — syncProfileIfDefault 에 그대로 넘긴다. */
export interface GoogleSignInResult extends IdTokenCredentials {
  displayName: string | null;
  avatarUrl: string | null;
}

export type LinkOrSignInResult =
  /** 익명 → 링크 성공, uid 보존(§3.1 정상 경로). */
  | { kind: 'linked'; uid: string }
  /** 이미 비익명 세션이었거나, 충돌 확인 후 기존 계정으로 로그인 완료. */
  | { kind: 'signed_in'; uid: string }
  /** 이 identity가 이미 다른 유저 소유 — 호출부가 경고 후 confirmConflictSignIn 호출해야 함. */
  | { kind: 'conflict'; provider: SocialProvider; credentials: IdTokenCredentials };

const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

let googleConfigured = false;
function ensureGoogleConfigured(): void {
  if (googleConfigured) return;
  GoogleSignin.configure({ iosClientId: GOOGLE_IOS_CLIENT_ID, webClientId: GOOGLE_WEB_CLIENT_ID });
  googleConfigured = true;
}

/**
 * 네이티브 Google 계정 선택 → idToken 획득. nonce 없음(위 파일 docstring 참고).
 * signOut 선행은 Phase 0에서 확인된 시뮬레이터 세션 스턱(work-log §10.3) 재발 방지용 —
 * 매번 fresh picker 를 강제한다. 로컬 캐시만 지우고 revoke 하지 않아 안전.
 */
export async function getGoogleIdToken(): Promise<GoogleSignInResult> {
  ensureGoogleConfigured();
  await GoogleSignin.signOut().catch(() => {});
  if (Platform.OS === 'android') {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  }
  const result = await GoogleSignin.signIn();
  if (result.type !== 'success') {
    throw new Error('사용자가 로그인을 취소했어요.');
  }
  const idToken = result.data.idToken;
  if (!idToken) {
    throw new Error('Google idToken을 받지 못했어요(설정 확인 필요).');
  }
  return {
    token: idToken,
    displayName: result.data.user.name,
    avatarUrl: result.data.user.photo,
  };
}

/** Apple은 이번 사이클 스코프 밖(§2.1 확정 유지, 실행만 보류) — 멤버십 취득 후 구현. */
export async function getAppleIdToken(): Promise<IdTokenCredentials & { fullName?: string | null }> {
  throw new Error(
    'Apple 로그인은 아직 구현되지 않았어요. Apple Developer 멤버십 취득 후 진행됩니다(login-workflow.md 참고).',
  );
}

/**
 * 익명이면 uid 보존 링킹을 시도하고, 이미 다른 유저 소유면 자동 로그인하지 않고 'conflict'를
 * 반환한다(§2.3). 이미 비익명 세션이면 바로 signInWithIdToken.
 */
export async function linkOrSignIn(
  provider: SocialProvider,
  credentials: IdTokenCredentials,
): Promise<LinkOrSignInResult> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const isAnonymous = session?.user.is_anonymous ?? true;

  if (!isAnonymous) {
    const uid = await signInWithIdToken(provider, credentials);
    return { kind: 'signed_in', uid };
  }

  const { data, error } = await supabase.auth.linkIdentity({
    provider,
    token: credentials.token,
    nonce: credentials.nonce,
  });

  if (!error) {
    const uid = data.session?.user.id ?? data.user?.id;
    if (!uid) throw new Error('linkIdentity 응답에 uid가 없어요.');
    return { kind: 'linked', uid };
  }

  if (error.code === 'identity_already_exists') {
    return { kind: 'conflict', provider, credentials };
  }
  throw error;
}

/**
 * conflict 응답을 받은 뒤, 사용자가 "임시 데이터 미승계" 경고를 확인한 다음에만 호출한다.
 * 현재 익명 세션을 버리고 기존 계정으로 로그인한다(§3.2 파국 경로 — uid가 바뀐다).
 */
export async function confirmConflictSignIn(
  provider: SocialProvider,
  credentials: IdTokenCredentials,
): Promise<{ uid: string }> {
  const uid = await signInWithIdToken(provider, credentials);
  return { uid };
}

async function signInWithIdToken(provider: SocialProvider, credentials: IdTokenCredentials): Promise<string> {
  const { data, error } = await supabase.auth.signInWithIdToken({
    provider,
    token: credentials.token,
    nonce: credentials.nonce,
  });
  if (error) throw error;
  return data.user.id;
}

/** 로그아웃 후 새 익명 세션으로 복귀(§4 아키텍처 — 로그인 없이도 앱은 계속 쓸 수 있어야 함). */
export async function signOutToAnonymous(): Promise<void> {
  if (Platform.OS !== 'web') {
    await GoogleSignin.signOut().catch(() => {});
  }
  await supabase.auth.signOut();
  await ensureAnonymousSession();
}

function isDefaultUsername(username: string, uid: string): boolean {
  return username === `user_${uid.slice(0, 8)}`;
}

/**
 * username이 아직 handle_new_user 기본값(user_<uid8>)일 때만 provider 이름/아바타로
 * public.users 를 update한다 — 사용자가 이미 정한 핸들을 덮지 않는다(§2.3).
 */
export async function syncProfileIfDefault(
  uid: string,
  profile: { displayName?: string | null; avatarUrl?: string | null },
): Promise<void> {
  if (!profile.displayName && !profile.avatarUrl) return;

  const { data: row, error } = await supabase
    .from('users')
    .select('username')
    .eq('id', uid)
    .maybeSingle();
  if (error) throw error;
  if (!row || !isDefaultUsername(row.username, uid)) return;

  const updates: Record<string, string> = {};
  if (profile.displayName) updates.username = profile.displayName;
  if (profile.avatarUrl) updates.profile_image_url = profile.avatarUrl;
  if (Object.keys(updates).length === 0) return;

  const { error: updateError } = await supabase.from('users').update(updates).eq('id', uid);
  if (updateError) throw updateError;
}
