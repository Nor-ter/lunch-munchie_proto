/**
 * app/profile/[id].tsx — 타인 프로필 (Phase 3 · follow-screen-wiring-workflow.md §3.1).
 *
 * useLocalSearchParams 로 id 를 받아 <ProfileView> 에 넘긴다. (tabs)/profile.tsx(내 프로필)와
 * ProfileView 컴포넌트를 공유 — 뒤로가기 헤더만 이 화면 고유(course/[id]/share.tsx 헤더 패턴).
 */
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { ProfileView } from '@/components/ProfileView';
import { THEME } from '@/constants/theme';

export default function OtherProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>프로필</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ProfileView userId={id} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: THEME.mapBg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: THEME.white,
    borderBottomWidth: 1,
    borderBottomColor: THEME.gray100,
  },
  backBtn: { padding: 4, minWidth: 32 },
  backArrow: { fontSize: 28, color: THEME.ink, lineHeight: 32 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '600', color: THEME.ink },
  headerSpacer: { minWidth: 32 },
});
