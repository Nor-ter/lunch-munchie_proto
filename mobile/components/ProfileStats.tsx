/**
 * ProfileStats — "팔로워 N · 팔로잉 M" 표시, 탭 시 목록 열기 (Phase 4).
 *
 * follow-feature-workflow.md §4. useFollowCounts(userId) 로 집계 쿼리 결과만 표시하는
 * 순수 표시 컴포넌트. 목록을 여는 동작은 부모(프로필 화면)가 FollowerListSheet 를 어떻게
 * 띄울지 결정하므로, 여기서는 onPressFollowers/onPressFollowing 콜백만 받는다
 * (AddRestaurantSheet 의 visible/onClose 처럼 부모가 시트 상태를 소유하는 패턴).
 *
 * 스타일: 프로젝트 하우스 스타일(StyleSheet + THEME). 새 라이브러리 없음.
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useFollowCounts } from '@/hooks/useFollowCounts';
import { THEME } from '@/constants/theme';

interface Props {
  userId: string;
  onPressFollowers?: () => void;
  onPressFollowing?: () => void;
}

export function ProfileStats({ userId, onPressFollowers, onPressFollowing }: Props) {
  const { data: counts, isLoading } = useFollowCounts(userId);

  return (
    <View style={styles.row}>
      <TouchableOpacity
        style={styles.stat}
        onPress={onPressFollowers}
        disabled={!onPressFollowers}
        activeOpacity={0.7}
      >
        <Text style={styles.count}>{isLoading ? '–' : counts?.followers ?? 0}</Text>
        <Text style={styles.label}>팔로워</Text>
      </TouchableOpacity>

      <View style={styles.divider} />

      <TouchableOpacity
        style={styles.stat}
        onPress={onPressFollowing}
        disabled={!onPressFollowing}
        activeOpacity={0.7}
      >
        <Text style={styles.count}>{isLoading ? '–' : counts?.following ?? 0}</Text>
        <Text style={styles.label}>팔로잉</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  stat: { alignItems: 'center', paddingHorizontal: 16 },
  divider: { width: 1, height: 24, backgroundColor: THEME.gray200 },
  count: { fontSize: 15, fontWeight: '700', color: THEME.ink },
  label: { fontSize: 11, color: THEME.gray500, marginTop: 2 },
});
