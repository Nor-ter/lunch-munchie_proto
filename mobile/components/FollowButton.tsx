/**
 * FollowButton — 팔로우/언팔로우 토글 버튼 (Phase 4).
 *
 * follow-feature-workflow.md §4. useIsFollowing 으로 현재 상태를 읽고, 탭 시
 * useToggleFollow(userId).mutate(!following) 로 다음 상태를 넘긴다 — 낙관적 업데이트라
 * 버튼이 네트워크 응답을 기다리지 않고 즉시 토글되고, 실패하면 훅이 알아서 롤백한다.
 *
 * 내 프로필(userId === myId)에는 렌더링하지 않는다 — follow_user RPC가 자기팔로우를
 * DB에서 막긴 하지만(§5.3), 애초에 누를 수 없는 버튼을 보여줄 필요가 없다.
 *
 * 스타일: 프로젝트 하우스 스타일(StyleSheet + THEME) — 기존 components/ 전부가 이 방식이라
 * NativeWind className 대신 그대로 따랐다. 새 라이브러리 없음.
 */
import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useCurrentUserId } from '@/hooks/useCurrentUserId';
import { useIsFollowing } from '@/hooks/useIsFollowing';
import { useToggleFollow } from '@/hooks/useToggleFollow';
import { THEME } from '@/constants/theme';

interface Props {
  /** 팔로우 대상(following_id) */
  userId: string;
}

export function FollowButton({ userId }: Props) {
  const { data: myId } = useCurrentUserId();
  const { data: isFollowing, isLoading: isStatusLoading } = useIsFollowing(userId);
  const toggle = useToggleFollow(userId);

  if (myId && myId === userId) return null;

  const following = !!isFollowing;
  const busy = isStatusLoading || toggle.isPending;

  return (
    <TouchableOpacity
      style={[styles.btn, following ? styles.btnFollowing : styles.btnFollow]}
      onPress={() => toggle.mutate(!following)}
      disabled={busy}
      activeOpacity={0.75}
    >
      {busy ? (
        <ActivityIndicator color={following ? THEME.gray500 : THEME.white} size="small" />
      ) : (
        <Text style={[styles.btnText, following ? styles.btnTextFollowing : styles.btnTextFollow]}>
          {following ? '팔로잉' : '팔로우'}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    minWidth: 76,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnFollow: { backgroundColor: THEME.coral },
  btnFollowing: {
    backgroundColor: THEME.white,
    borderWidth: 1,
    borderColor: THEME.gray200,
  },
  btnText: { fontSize: 12, fontWeight: '600' },
  btnTextFollow: { color: THEME.white },
  btnTextFollowing: { color: THEME.gray600 },
});
