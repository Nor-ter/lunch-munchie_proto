/**
 * ProfileView — 내/타인 프로필 화면 조립 (Phase 2 · follow-screen-wiring-workflow.md §3.2, §4.2).
 *
 * `(tabs)/profile.tsx`(내 프로필)와 `profile/[id].tsx`(타인 프로필) 둘 다 이 컴포넌트
 * 하나를 userId만 바꿔 공유한다(문서 §3.1 "화면 하나로 내/타인 통합").
 *
 * 데이터 현실 원칙(§2): 웹 client/src/pages/ProfilePage.tsx는 mock(이모지 아바타, 스와이프/
 * 좋아요 스탯, 카테고리 Top5, 식단)을 쓰지만 실제 public.users 컬럼은
 * id/username/profile_image_url/bio/location/created_at 뿐이다. 팔로워/팔로잉(ProfileStats)만
 * 실데이터로 새로 얹고, 나머지 mock 스탯은 defer — 빈 배열/undefined에 배선하지 않고 카드
 * 하나로 "분석 준비중" 플레이스홀더만 남긴다(§4.2 "빈 값에 배선 금지").
 *
 * FollowerListSheet의 visible/mode는 AddRestaurantSheet 패턴처럼 이 컴포넌트가 소유하고,
 * ProfileStats.onPressFollowers/onPressFollowing 콜백으로 연다.
 *
 * 톤은 웹 ProfilePage(흰 헤더 카드 + Soft Coral 포인트 + 하단 둥근 카드들) 참고, 스타일은
 * 하우스 스타일(StyleSheet + THEME). 새 라이브러리 없음.
 */
import React, { useState } from 'react';
import { View, Text, Image, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { useUser } from '@/hooks/useUser';
import { FollowButton } from '@/components/FollowButton';
import { ProfileStats } from '@/components/ProfileStats';
import { FollowerListSheet } from '@/components/FollowerListSheet';
import { THEME } from '@/constants/theme';

interface Props {
  userId: string;
  /** 프로필 본문 아래에 얹을 추가 콘텐츠(예: 내 프로필 탭의 개발용 계정 스위처). ScrollView 안이라 함께 스크롤됨. */
  footer?: React.ReactNode;
}

function formatJoinDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 가입`;
}

export function ProfileView({ userId, footer }: Props) {
  const { data: user, isLoading } = useUser(userId);
  const [sheetMode, setSheetMode] = useState<'followers' | 'following' | null>(null);

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={THEME.coral} size="small" />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.centered}>
        <Text style={styles.notFoundText}>유저를 찾을 수 없어요.</Text>
      </View>
    );
  }

  const initial = user.username.trim().charAt(0).toUpperCase() || '?';

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.headerCard}>
          <View style={styles.headerRow}>
            {user.profile_image_url ? (
              <Image source={{ uri: user.profile_image_url }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Text style={styles.avatarInitial}>{initial}</Text>
              </View>
            )}

            <View style={styles.headerInfo}>
              <Text style={styles.username} numberOfLines={1}>
                {user.username}
              </Text>
              <Text style={styles.joinDate}>{formatJoinDate(user.created_at)}</Text>
            </View>

            <FollowButton userId={userId} />
          </View>

          {(user.bio || user.location) && (
            <View style={styles.bioBlock}>
              {user.bio ? (
                <Text style={styles.bioText} numberOfLines={3}>
                  {user.bio}
                </Text>
              ) : null}
              {user.location ? <Text style={styles.locationText}>📍 {user.location}</Text> : null}
            </View>
          )}

          <View style={styles.statsRow}>
            <ProfileStats
              userId={userId}
              onPressFollowers={() => setSheetMode('followers')}
              onPressFollowing={() => setSheetMode('following')}
            />
          </View>
        </View>

        {/* defer: 스와이프/좋아요 스탯, 카테고리 Top5, 식단 — 실데이터 없음(§2). 빈 값 배선 대신
            플레이스홀더 카드 하나로만 자리를 남긴다. */}
        <View style={styles.placeholderCard}>
          <Text style={styles.placeholderTitle}>맛집 분석</Text>
          <Text style={styles.placeholderText}>스와이프 취향·선호 카테고리 분석은 준비 중이에요.</Text>
        </View>

        {footer}
      </ScrollView>

      <FollowerListSheet
        visible={sheetMode !== null}
        userId={userId}
        mode={sheetMode ?? 'followers'}
        onClose={() => setSheetMode(null)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.mapBg },
  content: { paddingBottom: 32 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: THEME.mapBg },
  notFoundText: { fontSize: 13, color: THEME.gray400 },
  headerCard: {
    backgroundColor: THEME.white,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: { width: 64, height: 64, borderRadius: 16 },
  avatarPlaceholder: {
    backgroundColor: THEME.coralLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: { fontSize: 26, fontWeight: '800', color: THEME.coral },
  headerInfo: { flex: 1, minWidth: 0 },
  username: { fontSize: 19, fontWeight: '800', color: THEME.ink },
  joinDate: { fontSize: 12, color: THEME.gray400, marginTop: 3 },
  bioBlock: { marginTop: 14 },
  bioText: { fontSize: 13, color: THEME.gray600, lineHeight: 18 },
  locationText: { fontSize: 12, color: THEME.gray400, marginTop: 4 },
  statsRow: { marginTop: 16, alignItems: 'flex-start' },
  placeholderCard: {
    backgroundColor: THEME.white,
    borderRadius: 16,
    marginHorizontal: 20,
    marginTop: 14,
    padding: 16,
  },
  placeholderTitle: { fontSize: 14, fontWeight: '700', color: THEME.ink, marginBottom: 6 },
  placeholderText: { fontSize: 12, color: THEME.gray400, lineHeight: 17 },
});
