/**
 * AccountBanner — 내 프로필 탭 전용 계정 상태 배너 (Phase 3 · login-workflow.md §3.1, §7 Phase 3).
 *
 * ProfileView는 내/타인 프로필에 공유되는 컴포넌트라 로그인 UI를 거기 넣지 않는다(§3.2 참고) —
 * 이 배너는 (tabs)/profile.tsx(내 프로필)에서만 ProfileView 위에 별도로 얹는다.
 *
 * 익명이면 로그인 유도 + LoginSheet 오픈 버튼, 정식 로그인이면 계정 표시 + 로그아웃.
 * 로그아웃/로그인 후 캐시 무효화는 app/_layout.tsx 의 onAuthStateChange 전역 구독이 처리한다.
 *
 * 스타일: 하우스 스타일(StyleSheet + THEME). 새 라이브러리 없음.
 */
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { useAuthStatus } from '@/hooks/useAuthStatus';
import { signOutToAnonymous } from '@/services/authApi';
import { LoginSheet } from '@/components/LoginSheet';
import { THEME } from '@/constants/theme';

export function AccountBanner() {
  const { data: status, isLoading } = useAuthStatus();
  const [sheetVisible, setSheetVisible] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  if (isLoading || !status) return null;

  const handleLogout = () => {
    Alert.alert('로그아웃', '로그아웃할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '로그아웃',
        style: 'destructive',
        onPress: async () => {
          setSigningOut(true);
          try {
            await signOutToAnonymous();
          } catch (err) {
            Alert.alert('로그아웃 실패', err instanceof Error ? err.message : '다시 시도해 주세요.');
          } finally {
            setSigningOut(false);
          }
        },
      },
    ]);
  };

  if (status.isAnonymous) {
    return (
      <View style={styles.banner}>
        <Text style={styles.bannerText}>로그인하면 기기를 바꿔도 계정을 이어갈 수 있어요.</Text>
        <TouchableOpacity
          style={styles.loginBtn}
          onPress={() => setSheetVisible(true)}
          activeOpacity={0.85}
        >
          <Text style={styles.loginBtnText}>로그인</Text>
        </TouchableOpacity>
        <LoginSheet visible={sheetVisible} onClose={() => setSheetVisible(false)} />
      </View>
    );
  }

  return (
    <View style={styles.banner}>
      <Text style={styles.bannerText}>로그인됨</Text>
      <TouchableOpacity
        style={styles.logoutBtn}
        onPress={handleLogout}
        disabled={signingOut}
        activeOpacity={0.85}
      >
        {signingOut ? (
          <ActivityIndicator color={THEME.gray600} size="small" />
        ) : (
          <Text style={styles.logoutBtnText}>로그아웃</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: THEME.white,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: THEME.gray100,
    gap: 12,
  },
  bannerText: { flex: 1, fontSize: 12, color: THEME.gray500 },
  loginBtn: {
    backgroundColor: THEME.coral,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  loginBtnText: { color: THEME.white, fontSize: 12, fontWeight: '700' },
  logoutBtn: {
    borderWidth: 1,
    borderColor: THEME.gray200,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
    minWidth: 64,
    alignItems: 'center',
  },
  logoutBtnText: { color: THEME.gray600, fontSize: 12, fontWeight: '600' },
});
