/**
 * DevAccountSwitcher — 개발용 테스트 계정 카드 (DEV 전용).
 *
 * 팔로우를 두 유저로 왕복 검증하기 위한 도구. 익명 유저를 만들고(+ 전환), 각 유저의
 * 프로필로 바로 진입해 팔로우해 볼 수 있다. 부모(내 프로필 탭)가 __DEV__ 일 때만 마운트하므로
 * 여기선 훅 규칙을 위해 __DEV__ 분기 없이 항상 훅을 호출한다.
 *
 * 검증 흐름:
 *   1) '새 테스트 유저 만들기' → 유저 B 생성(활성 세션이 B로 바뀜)
 *   2) 유저 A 행의 '프로필' → A 프로필에서 FollowButton(팔로우)
 *   3) B 프로필 탭 → ProfileStats '팔로잉' → 시트에 A 표시
 *   4) A 행 '전환' → A 프로필 → ProfileStats '팔로워' → 시트에 B 표시 (양방향 DB 반영 확인)
 *
 * 스타일: 하우스 스타일(StyleSheet + THEME). 새 라이브러리 없음.
 */
import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useDevAccounts } from '@/hooks/useDevAccounts';
import { useCurrentUserId } from '@/hooks/useCurrentUserId';
import { THEME } from '@/constants/theme';

export function DevAccountSwitcher() {
  const { data: myId } = useCurrentUserId();
  const { accountsQ, create, switchTo } = useDevAccounts();

  const accounts = accountsQ.data ?? [];
  const busy = create.isPending || switchTo.isPending;
  const errorMsg =
    (create.error instanceof Error && create.error.message) ||
    (switchTo.error instanceof Error && switchTo.error.message) ||
    null;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>🛠 개발용 · 테스트 계정</Text>
      <Text style={styles.hint}>익명 유저를 만들고 전환해 팔로우를 검증하세요.</Text>

      {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

      {accountsQ.isLoading ? (
        <ActivityIndicator color={THEME.coral} size="small" style={{ marginTop: 12 }} />
      ) : (
        accounts.map((a) => {
          const isCurrent = a.uid === myId;
          return (
            <View key={a.uid} style={styles.row}>
              <View style={styles.rowInfo}>
                <Text style={styles.username} numberOfLines={1}>
                  {a.username}
                  {isCurrent ? ' (현재)' : ''}
                </Text>
                <Text style={styles.uid}>{a.uid.slice(0, 8)}…</Text>
              </View>

              {!isCurrent && (
                <>
                  <TouchableOpacity
                    style={styles.smallBtn}
                    disabled={busy}
                    onPress={() => switchTo.mutate(a.uid)}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.smallBtnText}>전환</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.smallBtnOutline}
                    disabled={busy}
                    onPress={() => router.push(`/profile/${a.uid}`)}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.smallBtnOutlineText}>프로필</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          );
        })
      )}

      <TouchableOpacity
        style={[styles.createBtn, busy && styles.createBtnDisabled]}
        disabled={busy}
        onPress={() => create.mutate()}
        activeOpacity={0.85}
      >
        {create.isPending ? (
          <ActivityIndicator color={THEME.white} size="small" />
        ) : (
          <Text style={styles.createBtnText}>+ 새 테스트 유저 만들기</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: THEME.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: THEME.coralLight,
    marginHorizontal: 20,
    marginTop: 14,
    padding: 16,
  },
  title: { fontSize: 14, fontWeight: '700', color: THEME.ink },
  hint: { fontSize: 12, color: THEME.gray400, marginTop: 4, marginBottom: 6 },
  errorText: { fontSize: 12, color: THEME.deleteRed, marginTop: 6 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: THEME.gray100,
    gap: 8,
  },
  rowInfo: { flex: 1, minWidth: 0 },
  username: { fontSize: 13, fontWeight: '600', color: THEME.ink },
  uid: { fontSize: 11, color: THEME.gray400, marginTop: 2 },
  smallBtn: {
    backgroundColor: THEME.coral,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  smallBtnText: { color: THEME.white, fontSize: 12, fontWeight: '600' },
  smallBtnOutline: {
    borderWidth: 1,
    borderColor: THEME.gray200,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  smallBtnOutlineText: { color: THEME.gray600, fontSize: 12, fontWeight: '600' },
  createBtn: {
    backgroundColor: THEME.coral,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 14,
  },
  createBtnDisabled: { opacity: 0.6 },
  createBtnText: { color: THEME.white, fontSize: 14, fontWeight: '700' },
});
