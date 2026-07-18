/**
 * app/(tabs)/index.tsx — '홈' 탭 스텁 (Phase 1 · follow-screen-wiring-workflow.md §3.1).
 *
 * 기존 루트 app/index.tsx는 개발 편의용 자동 리다이렉트(/course/c1/edit)였다. (tabs) 그룹
 * 안에 그대로 옮기면 탭바 진입 즉시 다른 화면으로 튕겨나가 탭바 자체를 확인할 수 없게 된다.
 * 홈 탭 실제 구현은 스코프 밖(§8)이라, 자동 리다이렉트 대신 정적 스텁을 두고 기존 개발용
 * 진입 경로는 링크로 보존한다(탭 한 번 더 눌러 접근 가능).
 */
import { View, Text, StyleSheet } from 'react-native';
import { Link } from 'expo-router';
import { THEME } from '@/constants/theme';

export default function HomeTab() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>홈</Text>
      <Text style={styles.sub}>준비 중이에요.</Text>
      <Link href="/course/c1/edit" style={styles.devLink}>
        개발용: 코스 c1 편집 화면 열기
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.white,
    gap: 8,
  },
  title: { fontSize: 18, fontWeight: '700', color: THEME.ink },
  sub: { fontSize: 13, color: THEME.gray400 },
  devLink: { marginTop: 20, fontSize: 12, color: THEME.coral, textDecorationLine: 'underline' },
});
