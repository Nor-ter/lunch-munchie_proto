/**
 * FollowerListSheet — 팔로워/팔로잉 목록 바텀시트 (Phase 4).
 *
 * follow-feature-workflow.md §4. mode 로 어느 목록인지 결정하고, 각 행에 아바타+username +
 * FollowButton 을 얹는다(§4 "각 행에 FollowButton"). userId 는 FK가 없어(§2.5) orphan은
 * 훅 단계(getFollowers/getFollowing)에서 이미 제외된 상태로 들어온다.
 *
 * !visible 이거나 반대쪽 mode 일 때는 해당 훅에 빈 userId 를 넘겨 쿼리를 비활성화한다
 * (useFollowers/useFollowing 내부 enabled: !!userId 재사용 — 새 옵션 추가 없이 낭비 호출 방지).
 *
 * 행 탭(아바타/username 영역) → 그 유저의 프로필로 이동(follow-screen-wiring-workflow.md
 * §3.3 동선 2). 시트를 먼저 닫고 push — 시트가 열린 채로 다른 화면이 쌓이지 않게.
 * FollowButton 은 별도 형제 요소라 그 안을 눌러도 행 전체의 탭(프로필 이동)으로 안 번진다.
 *
 * 바텀시트는 AddRestaurantSheet 와 동일하게 core RN Modal 사용 — 새 라이브러리 없음.
 * 스타일: 프로젝트 하우스 스타일(StyleSheet + THEME).
 */
import React from 'react';
import {
  View,
  Text,
  Image,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  Modal,
  Pressable,
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import { useFollowers } from '@/hooks/useFollowers';
import { useFollowing } from '@/hooks/useFollowing';
import { FollowButton } from '@/components/FollowButton';
import type { User } from '@/types/db';
import { THEME } from '@/constants/theme';

interface Props {
  visible: boolean;
  userId: string;
  mode: 'followers' | 'following';
  onClose: () => void;
}

export function FollowerListSheet({ visible, userId, mode, onClose }: Props) {
  const followersQ = useFollowers(visible && mode === 'followers' ? userId : '');
  const followingQ = useFollowing(visible && mode === 'following' ? userId : '');
  const activeQ = mode === 'followers' ? followersQ : followingQ;
  const title = mode === 'followers' ? '팔로워' : '팔로잉';

  const handlePressRow = (targetUserId: string) => {
    onClose();
    router.push(`/profile/${targetUserId}`);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />

      <View style={styles.sheet}>
        <View style={styles.sheetHandle} />
        <Text style={styles.sheetTitle}>{title}</Text>

        {activeQ.isLoading && (
          <ActivityIndicator color={THEME.coral} size="small" style={{ marginTop: 16 }} />
        )}

        {!activeQ.isLoading && (
          <FlatList
            data={activeQ.data ?? []}
            keyExtractor={(u: User) => u.id}
            style={styles.list}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <Text style={styles.emptyText}>{title} 목록이 비어 있어요.</Text>
            }
            renderItem={({ item }: { item: User }) => (
              <View style={styles.row}>
                <TouchableOpacity
                  style={styles.rowTapArea}
                  onPress={() => handlePressRow(item.id)}
                  activeOpacity={0.7}
                >
                  {item.profile_image_url ? (
                    <Image source={{ uri: item.profile_image_url }} style={styles.avatar} />
                  ) : (
                    <View style={[styles.avatar, styles.avatarPlaceholder]} />
                  )}
                  <Text style={styles.username} numberOfLines={1}>
                    {item.username}
                  </Text>
                </TouchableOpacity>
                <FollowButton userId={item.id} />
              </View>
            )}
          />
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
    maxHeight: '75%',
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: THEME.gray200,
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetTitle: { fontSize: 16, fontWeight: '700', color: THEME.ink, marginBottom: 10 },
  list: { marginTop: 4 },
  listContent: { paddingBottom: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: THEME.gray100,
    gap: 10,
  },
  rowTapArea: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 0 },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  avatarPlaceholder: { backgroundColor: THEME.gray100 },
  username: { flex: 1, fontSize: 13, fontWeight: '600', color: THEME.ink },
  emptyText: {
    textAlign: 'center',
    color: THEME.gray400,
    fontSize: 13,
    marginTop: 20,
  },
});
