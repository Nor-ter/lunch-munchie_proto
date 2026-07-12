/**
 * app/(tabs)/_layout.tsx — 하단 탭바 (Phase 1 · follow-screen-wiring-workflow.md §3.1)
 *
 * Expo Router `Tabs`만 사용(React Navigation 직접 config 금지). 이 스코프의 필수 탭은
 * '프로필' 하나 — 팔로우 기능을 실제로 쓸 진입점이 이거라서. 지도/런치/저장 탭은 아직
 * 화면 자체가 없어(스코프 밖 §8) 여기 추가하지 않는다 — 백업 라우트 파일 없이 Tabs.Screen만
 * 넣으면 탭 진입 시 깨지므로, 실제 구현 전까지는 자리만 주석으로 남겨 둔다.
 * 탭 라벨/순서는 웹 client/src/components/TabBar.tsx(홈/지도/런치/저장/프로필) 톤을 참고했고,
 * 아이콘은 새 라이브러리 없이 이모지로 대체.
 */
import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { THEME } from '@/constants/theme';

function TabIcon({ emoji, color }: { emoji: string; color: string }) {
  return <Text style={{ fontSize: 20, color }}>{emoji}</Text>;
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: THEME.coral,
        tabBarInactiveTintColor: THEME.gray400,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '홈',
          tabBarIcon: ({ color }) => <TabIcon emoji="🏠" color={color} />,
        }}
      />

      {/* 자리만(스코프 밖 §8) — 화면 구현 전까지 Tabs.Screen 추가하지 않음:
          <Tabs.Screen name="explore" options={{ title: '지도' }} />
          <Tabs.Screen name="lunchie" options={{ title: '런치' }} />
          <Tabs.Screen name="saved" options={{ title: '저장' }} /> */}

      <Tabs.Screen
        name="profile"
        options={{
          title: '프로필',
          tabBarIcon: ({ color }) => <TabIcon emoji="👤" color={color} />,
        }}
      />
    </Tabs>
  );
}
