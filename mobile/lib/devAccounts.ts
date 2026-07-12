/**
 * lib/devAccounts.ts — 개발용 익명 계정 스위처 (DEV 전용).
 *
 * 팔로우를 두 유저로 수동 검증하려면 한 기기에서 여러 익명 세션을 오갈 수 있어야 한다.
 * 익명 로그인도 정상 JWT 세션(access/refresh token)을 발급하므로, 각 세션 토큰을
 * AsyncStorage에 저장해 두고 setSession으로 복원하면 "다른 유저로 로그인"을 흉내 낼 수 있다.
 * (테이블에 SQL로 유저를 심지 않고 앱의 실제 익명 로그인 경로를 그대로 태워야 handle_new_user
 * 트리거가 public.users 행까지 만들어 준다 — CLAUDE.md "인증 흐름 상이" 주의와 동일 맥락.)
 *
 * ⚠️ 이 도구는 __DEV__ 빌드 검증용이다. 프로덕션 UI엔 노출하지 않는다(DevAccountSwitcher가
 * __DEV__ 게이트). 저장하는 값은 supabase-js가 이미 로컬에 보관하는 것과 동일한 세션 토큰이라
 * 새로운 비밀 노출은 아니다.
 *
 * 스택: supabase-js + AsyncStorage(둘 다 기존). 새 라이브러리 없음.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

const STORAGE_KEY = 'dev_accounts_v1';

export interface DevAccount {
  uid: string;
  username: string;
}

interface StoredSession extends DevAccount {
  access_token: string;
  refresh_token: string;
}

async function readStore(): Promise<StoredSession[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as StoredSession[];
  } catch {
    return [];
  }
}

async function writeStore(list: StoredSession[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

/** handle_new_user 트리거가 넣는 username 규칙(user_ + uid 앞 8자)과 동일 — 별도 조회 없이 라벨 생성. */
function deriveUsername(uid: string): string {
  return `user_${uid.slice(0, 8)}`;
}

/** 현재 활성 세션을 스토어에 upsert(전환/생성 전에 토큰을 잃지 않도록 항상 먼저 호출). */
async function persistCurrentSession(): Promise<void> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return;
  const list = await readStore();
  const entry: StoredSession = {
    uid: session.user.id,
    username: deriveUsername(session.user.id),
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  };
  // 같은 uid는 최신 토큰으로 갱신하고 맨 앞으로.
  await writeStore([entry, ...list.filter((a) => a.uid !== entry.uid)]);
}

/** 저장된(=지금까지 이 기기에서 만든) 테스트 계정 목록. 현재 세션도 포함되도록 먼저 저장. */
export async function listDevAccounts(): Promise<DevAccount[]> {
  await persistCurrentSession();
  const list = await readStore();
  return list.map(({ uid, username }) => ({ uid, username }));
}

/** 새 익명 유저 생성(현재 유저는 보존). 생성 직후 그 유저로 활성 세션이 바뀐다. */
export async function createTestUser(): Promise<DevAccount> {
  await persistCurrentSession(); // 현재 유저 토큰 보존
  // 로컬 세션만 해제(scope:'local') — 원격 refresh token은 살아 있어 나중에 setSession으로 복귀 가능.
  await supabase.auth.signOut({ scope: 'local' });
  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) throw error;
  if (!data.session) throw new Error('익명 세션 생성에 실패했어요.');
  await persistCurrentSession(); // 새 유저 저장
  return { uid: data.session.user.id, username: deriveUsername(data.session.user.id) };
}

/** 저장된 계정으로 활성 세션 전환. */
export async function switchToUser(uid: string): Promise<void> {
  await persistCurrentSession(); // 떠나기 전 현재 세션 최신 토큰 저장
  const list = await readStore();
  const target = list.find((a) => a.uid === uid);
  if (!target) throw new Error('저장된 계정을 찾을 수 없어요.');
  const { error } = await supabase.auth.setSession({
    access_token: target.access_token,
    refresh_token: target.refresh_token,
  });
  if (error) throw error;
  await persistCurrentSession(); // setSession이 토큰을 갱신했을 수 있으니 재저장
}
