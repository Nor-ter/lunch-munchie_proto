/**
 * app/(tabs)/profile.tsx — '내 프로필' 탭 (follow-screen-wiring-workflow.md §3.1 + login-workflow.md §7 Phase 3).
 *
 * useCurrentUserId 로 내 uid 를 얻어 <ProfileView> 에 넘긴다. profile/[id].tsx(타인 프로필)와
 * ProfileView 컴포넌트 하나를 공유 — 렌더 로직은 여기 없고 전부 ProfileView 안에 있다.
 *
 * AccountBanner(로그인/로그아웃)는 ProfileView 위에 별도로 얹는다 — ProfileView는 타인
 * 프로필과 공유되는 컴포넌트라 로그인 상태 UI를 그 안에 넣지 않는다(login-workflow.md §3.2).
 */
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCurrentUserId } from '@/hooks/useCurrentUserId';
import { ProfileView } from '@/components/ProfileView';
import { AccountBanner } from '@/components/AccountBanner';
import { DevAccountSwitcher } from '@/components/DevAccountSwitcher';
import { THEME } from '@/constants/theme';

export default function ProfileTab() {
  const { data: myId, isLoading, isError } = useCurrentUserId();

  if (isLoading) {
    return (
      <SafeAreaView style={styles.centered} edges={['top']}>
        <ActivityIndicator color={THEME.coral} size="small" />
      </SafeAreaView>
    );
  }

  if (isError || !myId) {
    return (
      <SafeAreaView style={styles.centered} edges={['top']}>
        <Text style={styles.errorText}>로그인 세션을 확인할 수 없어요.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AccountBanner />
      {/* 개발용 계정 스위처는 __DEV__ 빌드에서만, 내 프로필 탭에서만(ProfileView footer). */}
      <ProfileView userId={myId} footer={__DEV__ ? <DevAccountSwitcher /> : undefined} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: THEME.mapBg },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.mapBg,
  },
  errorText: { fontSize: 13, color: THEME.gray400 },
});
