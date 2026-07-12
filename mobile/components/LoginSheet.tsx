/**
 * LoginSheet — 소셜 로그인 바텀시트 (Phase 3 · login-workflow.md §7 Phase 3).
 *
 * 익명 세션 상태에서 열린다. Google 버튼만 실제로 동작(Apple은 Apple Developer 멤버십 취득
 * 전까지 스코프 밖 — 문서 상단 [2026-07-12] 스코프 축소 노트, authApi.getAppleIdToken 참고).
 * 대신 App Store 심사(Guideline 4.8, iOS엔 Apple 필수 노출) 요건을 잊지 않도록 비활성 버튼을
 * 자리만 남겨둔다.
 *
 * 흐름: getGoogleIdToken() → linkOrSignIn('google', …).
 *  - 'linked'|'signed_in' → syncProfileIfDefault(기본값 username일 때만 provider 이름/아바타
 *    반영, §2.3) → 시트 닫기. 캐시 무효화는 app/_layout.tsx 의 onAuthStateChange 전역 구독이
 *    처리하므로 여기서 따로 queryClient.clear() 하지 않는다.
 *  - 'conflict' → 경고("임시 데이터 미승계") 노출 후 사용자가 명시적으로 확인해야
 *    confirmConflictSignIn 호출(§2.3 — 자동 진행 금지).
 *
 * 바텀시트는 FollowerListSheet/AddRestaurantSheet 와 동일하게 core RN Modal 사용.
 * 스타일: 하우스 스타일(StyleSheet + THEME). 새 라이브러리 없음.
 */
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, Modal, Pressable } from 'react-native';
import {
  getGoogleIdToken,
  linkOrSignIn,
  confirmConflictSignIn,
  syncProfileIfDefault,
  type GoogleSignInResult,
} from '@/services/authApi';
import { THEME } from '@/constants/theme';

interface Props {
  visible: boolean;
  onClose: () => void;
}

type Step =
  | { kind: 'idle' }
  | { kind: 'loading' }
  // authApi.LinkOrSignInResult 의 conflict 케이스는 credentials(token/nonce)만 들고 있어
  // displayName/avatarUrl 이 없다 — 충돌 확인 후에도 프로필 동기화를 하려면 getGoogleIdToken()
  // 이 원래 돌려준 전체 result(GoogleSignInResult)를 여기서 직접 들고 있어야 한다(버그 수정,
  // work-log §14 참고: 이전엔 이 필드가 없어 충돌 경로에서 syncProfileIfDefault 가 아예 호출 안 됨).
  | { kind: 'conflict'; result: GoogleSignInResult }
  | { kind: 'error'; message: string };

export function LoginSheet({ visible, onClose }: Props) {
  const [step, setStep] = useState<Step>({ kind: 'idle' });

  // 열릴 때마다 이전 시도의 에러/충돌 상태를 지운다.
  useEffect(() => {
    if (visible) setStep({ kind: 'idle' });
  }, [visible]);

  const handleGoogle = async () => {
    setStep({ kind: 'loading' });
    try {
      const result = await getGoogleIdToken();
      const outcome = await linkOrSignIn('google', result);

      if (outcome.kind === 'conflict') {
        setStep({ kind: 'conflict', result });
        return;
      }

      // 기본값 username일 때만 반영(§2.3) — 실패해도 로그인 자체는 이미 끝났으니 조용히 무시.
      await syncProfileIfDefault(outcome.uid, {
        displayName: result.displayName,
        avatarUrl: result.avatarUrl,
      }).catch(() => {});

      onClose();
    } catch (err) {
      setStep({
        kind: 'error',
        message: err instanceof Error ? err.message : '로그인에 실패했어요.',
      });
    }
  };

  const handleConfirmConflict = async () => {
    if (step.kind !== 'conflict') return;
    setStep({ kind: 'loading' });
    try {
      const { uid } = await confirmConflictSignIn('google', step.result);
      await syncProfileIfDefault(uid, {
        displayName: step.result.displayName,
        avatarUrl: step.result.avatarUrl,
      }).catch(() => {});
      onClose();
    } catch (err) {
      setStep({
        kind: 'error',
        message: err instanceof Error ? err.message : '로그인에 실패했어요.',
      });
    }
  };

  const busy = step.kind === 'loading';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={busy ? undefined : onClose} />

      <View style={styles.sheet}>
        <View style={styles.sheetHandle} />
        <Text style={styles.sheetTitle}>로그인</Text>
        <Text style={styles.sheetSub}>기기를 바꿔도 코스와 팔로우를 이어갈 수 있어요.</Text>

        {step.kind === 'conflict' ? (
          <View style={styles.conflictBox}>
            <Text style={styles.conflictTitle}>⚠️ 이미 가입된 계정이에요</Text>
            <Text style={styles.conflictText}>
              로그인하면 지금 기기의 임시(익명) 데이터는 이 계정으로 승계되지 않아요.
            </Text>
            <TouchableOpacity
              style={[styles.dangerBtn, busy && styles.btnDisabled]}
              onPress={handleConfirmConflict}
              disabled={busy}
              activeOpacity={0.85}
            >
              {busy ? (
                <ActivityIndicator color={THEME.white} size="small" />
              ) : (
                <Text style={styles.dangerBtnText}>그래도 이 계정으로 로그인</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose} disabled={busy} hitSlop={8}>
              <Text style={styles.cancelText}>취소</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <TouchableOpacity
              style={[styles.googleBtn, busy && styles.btnDisabled]}
              onPress={handleGoogle}
              disabled={busy}
              activeOpacity={0.85}
            >
              {busy ? (
                <ActivityIndicator color={THEME.white} size="small" />
              ) : (
                <Text style={styles.googleBtnText}>Google로 계속하기</Text>
              )}
            </TouchableOpacity>

            {/* Apple: Apple Developer 멤버십 취득 전까지 비활성 자리만(App Store 심사 요건
                상기용 — login-workflow.md §2.1 "iOS엔 Apple 필수 노출"). */}
            <View style={[styles.appleBtn, styles.btnDisabled]}>
              <Text style={styles.appleBtnText}>Apple로 계속하기 (준비 중)</Text>
            </View>

            {step.kind === 'error' && <Text style={styles.errorText}>{step.message}</Text>}
          </>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' },
  sheet: {
    backgroundColor: THEME.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: THEME.gray200,
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetTitle: { fontSize: 16, fontWeight: '700', color: THEME.ink },
  sheetSub: { fontSize: 12, color: THEME.gray400, marginTop: 4, marginBottom: 20 },
  googleBtn: {
    backgroundColor: THEME.ink,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  googleBtnText: { color: THEME.white, fontSize: 15, fontWeight: '700' },
  appleBtn: {
    borderWidth: 1,
    borderColor: THEME.gray200,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  appleBtnText: { color: THEME.gray500, fontSize: 15, fontWeight: '700' },
  btnDisabled: { opacity: 0.5 },
  errorText: {
    textAlign: 'center',
    color: THEME.deleteRed,
    fontSize: 12,
    marginTop: 14,
    lineHeight: 18,
  },
  conflictBox: {
    backgroundColor: THEME.coralLight,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
  },
  conflictTitle: { fontSize: 14, fontWeight: '700', color: THEME.ink, marginBottom: 6 },
  conflictText: {
    fontSize: 12,
    color: THEME.gray600,
    textAlign: 'center',
    lineHeight: 17,
    marginBottom: 14,
  },
  dangerBtn: {
    backgroundColor: THEME.deleteRed,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  dangerBtnText: { color: THEME.white, fontSize: 14, fontWeight: '700' },
  cancelText: { color: THEME.gray500, fontSize: 13, marginTop: 12 },
});
