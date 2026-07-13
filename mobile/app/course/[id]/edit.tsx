/**
 * app/course/[id]/edit.tsx — 코스 편집 화면
 *
 * Phase 2(로컬 편집 · 미저장): 진입 시 서버 stop(useItems)을 editStore.draft 로 복제하고,
 * 이후 편집(순서 변경·삭제·추가)은 **전부 editStore(draft)에서만** 한다. TanStack Query
 * 캐시는 직접 건드리지 않는다(읽기 전용 진실).
 *  · 순서 변경: DraggableFlatList onDragEnd → editStore.reorder (order_index 재계산, dirty)
 *  · 삭제: EditableStopRow swipe → editStore.removeItem (낙관적) — Undo 스낵바로 복원 가능
 *  · 추가(Phase 4): AddRestaurantSheet → place-details(선택 시 1회) → editStore.addItem
 *  · 지도 마커: draftItems 파생이라 편집 즉시 낙관적 갱신
 *
 * Phase 5(커밋 + 경로):
 *  · 저장 버튼: dirty 일 때만 활성 → itemsApi.commit(RPC, 트랜잭션 원자성) → 성공 시
 *    invalidateQueries(['items',id]) + markCommitted(dirty=false) + 성공 배너.
 *    실패 시 draft/dirty 그대로 유지하고 롤백 배너(재시도 가능 — RPC가 실패하면 DB엔
 *    아무 변경도 안 남아있으므로 "롤백"은 이미 보장돼 있고, 배너는 그 사실을 알릴 뿐).
 *  · 경로: useDirections(draft 순서 좌표, debounce) → Directions 폴리라인을 CourseMap에 전달.
 *
 * 스택: Expo Router, TanStack Query, Zustand(editStore), react-native-maps,
 *       draggable-flatlist + reanimated/gesture-handler(SwipeableRow). 새 라이브러리 없음.
 * (토스트/스낵바는 별도 라이브러리 없이 화면 하단 배너를 직접 구현했다.)
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import DraggableFlatList, {
  ScaleDecorator,
} from 'react-native-draggable-flatlist';
import { useCourse } from '@/hooks/useCourse';
import { useItems } from '@/hooks/useItems';
import { useDirections } from '@/hooks/useDirections';
import { useRefreshStaleRestaurants } from '@/hooks/useRefreshStaleRestaurants';
import { useUser } from '@/hooks/useUser';
import { commit as commitItems } from '@/services/itemsApi';
import { useEditStore } from '@/store/editStore';
import { EditableStopRow } from '@/components/EditableStopRow';
import { AddRestaurantSheet } from '@/components/AddRestaurantSheet';
import { CourseMap, type MapPoint } from '@/components/CourseMap';
import { describeApiError } from '@/lib/apiErrorMessage';
import type { CourseItemWithRestaurant } from '@/types/db';
import { THEME } from '@/constants/theme';

const UNDO_TIMEOUT_MS = 4000;
const BANNER_TIMEOUT_MS = 2500;

type Banner =
  | { kind: 'undo'; item: CourseItemWithRestaurant; atIndex: number }
  | { kind: 'success'; message: string }
  | { kind: 'error'; message: string };

export default function CourseEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width } = useWindowDimensions();
  const queryClient = useQueryClient();
  const [addSheetVisible, setAddSheetVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState<Banner | null>(null);
  const bannerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const courseQ = useCourse(id);
  const itemsQ = useItems(id);

  // ── editStore (draft) — 편집은 여기서만 ──────────────────────────────────────
  const draftItems = useEditStore((s) => s.draftItems);
  const dirty = useEditStore((s) => s.dirty);
  const setDraft = useEditStore((s) => s.setDraft);
  const reorder = useEditStore((s) => s.reorder);
  const removeItem = useEditStore((s) => s.removeItem);
  const insertItemAt = useEditStore((s) => s.insertItemAt);
  const markCommitted = useEditStore((s) => s.markCommitted);
  const reset = useEditStore((s) => s.reset);

  // 서버 데이터 → draft 복제. 편집 중(dirty)이면 사용자의 로컬 변경을 덮지 않는다.
  useEffect(() => {
    if (itemsQ.data && !dirty) setDraft(itemsQ.data);
  }, [itemsQ.data, dirty, setDraft]);

  // 화면을 떠나면 draft 초기화(다음 진입 시 서버에서 다시 복제).
  useEffect(() => () => reset(), [reset]);

  // Phase 6 §1: TTL(30일) 만료된 google 소스 식당을 백그라운드에서 lazy refresh.
  useRefreshStaleRestaurants(id, itemsQ.data ?? []);

  // 배너 자동 소멸 타이머 (undo는 좀 더 길게, success/error는 짧게).
  useEffect(() => {
    if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
    if (!banner) return;
    const ms = banner.kind === 'undo' ? UNDO_TIMEOUT_MS : BANNER_TIMEOUT_MS;
    bannerTimerRef.current = setTimeout(() => setBanner(null), ms);
    return () => {
      if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
    };
  }, [banner]);

  const isLoading = courseQ.isLoading || itemsQ.isLoading;
  const isError = courseQ.isError || itemsQ.isError;
  const course = courseQ.data;

  // 작성자 탭 → 프로필 진입(follow-screen-wiring-workflow.md §3.3 동선 1). 작성자 표시 UI가
  // 없어서 최소한의 칩으로 추가.
  const authorQ = useUser(course?.author_id ?? '');

  // 지도 포인트 = draft 파생(낙관적). 순서/삭제/추가가 즉시 반영된다.
  const points: MapPoint[] = useMemo(
    () =>
      draftItems.map((it) => ({
        id: it.id,
        name: it.restaurant.name,
        latitude: it.restaurant.latitude,
        longitude: it.restaurant.longitude,
        subtitle:
          it.restaurant.review_count > 0
            ? `${it.restaurant.category} · ★ ${it.restaurant.rating.toFixed(1)}`
            : it.restaurant.category,
      })),
    [draftItems],
  );

  // Phase 5: draft 순서 기준 실제 도보 경로(debounce 내장) → CourseMap 폴리라인.
  const directions = useDirections(
    useMemo(() => points.map((p) => ({ latitude: p.latitude, longitude: p.longitude })), [points]),
  );

  const retry = () => {
    courseQ.refetch();
    itemsQ.refetch();
  };

  const handleBack = () => {
    if (dirty) {
      Alert.alert('편집 취소', '저장하지 않은 변경이 있어요. 나가시겠어요?', [
        { text: '계속 편집', style: 'cancel' },
        {
          text: '나가기',
          style: 'destructive',
          onPress: () => {
            reset();
            router.back();
          },
        },
      ]);
    } else {
      router.back();
    }
  };

  // 삭제 → Undo 배너 노출(원래 인덱스 기억). 배너 안 누르고 타임아웃되면 그대로 확정.
  const handleDeleteItem = (item: CourseItemWithRestaurant, atIndex: number) => {
    removeItem(item.id);
    setBanner({ kind: 'undo', item, atIndex });
  };

  const handleUndo = () => {
    if (!banner || banner.kind !== 'undo') return;
    insertItemAt(banner.item, banner.atIndex);
    setBanner(null);
  };

  const handleSave = async () => {
    if (!course || saving) return;
    setSaving(true);
    try {
      // RPC 1회 호출 = DB 트랜잭션 1개 → 원자적. 실패 시 여기서 throw, DB엔 아무 변경도 없다.
      await commitItems(course.id, draftItems);
      await queryClient.invalidateQueries({ queryKey: ['items', course.id] });
      markCommitted();
      setBanner({ kind: 'success', message: '저장했어요' });
    } catch (err) {
      // 실패해도 draft/dirty 는 그대로 유지 — 사용자가 편집 내용을 잃지 않고 재시도 가능.
      setBanner({ kind: 'error', message: `저장 실패 — ${describeApiError(err)}` });
    } finally {
      setSaving(false);
    }
  };

  const mapWidth = width;
  const mapHeight = 220;

  // ── 상태별 본문 ──────────────────────────────────────────────────────────────
  let body: React.ReactNode;

  if (isLoading) {
    body = (
      <View style={styles.center}>
        <ActivityIndicator color={THEME.coral} />
        <Text style={styles.stateText}>불러오는 중…</Text>
      </View>
    );
  } else if (isError) {
    body = (
      <View style={styles.center}>
        <Text style={styles.stateTitle}>코스를 불러오지 못했어요</Text>
        <Text style={styles.stateText}>
          {describeApiError(courseQ.error ?? itemsQ.error)}
        </Text>
        <TouchableOpacity style={styles.retryBtn} onPress={retry}>
          <Text style={styles.retryText}>다시 시도</Text>
        </TouchableOpacity>
      </View>
    );
  } else if (!course) {
    body = (
      <View style={styles.center}>
        <Text style={styles.stateTitle}>코스를 찾을 수 없어요</Text>
        <Text style={styles.stateText}>삭제되었거나 접근 권한이 없는 코스예요.</Text>
      </View>
    );
  } else {
    body = (
      <View style={styles.flex}>
        {/* 지도 프리뷰 (draft 파생 → 편집 즉시 반영. routeCoordinates 도착 전엔 직선 폴백) */}
        {points.length > 0 ? (
          <View style={{ width: mapWidth, height: mapHeight }}>
            <CourseMap
              points={points}
              width={mapWidth}
              height={mapHeight}
              routeCoordinates={directions.coordinates}
            />
          </View>
        ) : (
          <View style={[styles.mapPlaceholder, { width: mapWidth, height: mapHeight }]}>
            <Text style={styles.stateText}>지도에 표시할 위치가 없어요</Text>
          </View>
        )}

        {/* 편집 리스트 (드래그 순서변경 + 스와이프 삭제) */}
        <DraggableFlatList
          data={draftItems}
          keyExtractor={(it) => it.id}
          onDragEnd={({ data }) => reorder(data)}
          activationDistance={12}
          containerStyle={styles.flex}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>장소 · {draftItems.length}개</Text>
              <Text style={styles.sectionHint}>
                길게 눌러 순서 변경 · 왼쪽으로 밀어 삭제
                {directions.distanceMeters != null &&
                  ` · 도보 약 ${Math.round(directions.distanceMeters / 100) / 10}km`}
                {directions.isError && ' · 경로를 불러오지 못했어요(직선으로 표시 중)'}
              </Text>
            </View>
          }
          renderItem={({ item, drag, isActive, getIndex }) => (
            <ScaleDecorator>
              <EditableStopRow
                item={item}
                index={getIndex() ?? 0}
                drag={drag}
                isActive={isActive}
                onDelete={() => handleDeleteItem(item, getIndex() ?? 0)}
              />
            </ScaleDecorator>
          )}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.stateTitle}>담긴 식당이 없어요</Text>
              <Text style={styles.stateText}>아래에서 식당을 추가해 보세요.</Text>
            </View>
          }
        />

        {/* 항상 노출되는 추가 버튼(리스트 empty/non-empty 와 무관) */}
        <View style={styles.addPlaceBar}>
          <TouchableOpacity
            style={styles.addPlaceBtn}
            onPress={() => setAddSheetVisible(true)}
          >
            <Text style={styles.addPlaceBtnText}>+ 식당 추가</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Nav bar */}
      <View style={styles.navBar}>
        <TouchableOpacity onPress={handleBack} style={styles.navBtn}>
          <Text style={styles.navBtnText}>← 뒤로</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle} numberOfLines={1}>
          {course?.title ?? '코스 편집'}
        </Text>
        <TouchableOpacity
          onPress={handleSave}
          disabled={!dirty || saving}
          style={[styles.saveBtn, (!dirty || saving) && styles.saveBtnDisabled]}
        >
          {saving ? (
            <ActivityIndicator size="small" color={THEME.coral} />
          ) : (
            <Text style={[styles.saveBtnText, !dirty && styles.saveBtnTextDisabled]}>
              저장
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {course && (
        <TouchableOpacity
          style={styles.authorRow}
          onPress={() => router.push(`/profile/${course.author_id}`)}
          activeOpacity={0.7}
        >
          <Text style={styles.authorText} numberOfLines={1}>
            {authorQ.data ? `by ${authorQ.data.username}` : '작성자 정보 불러오는 중…'}
          </Text>
        </TouchableOpacity>
      )}

      {body}

      {/* 하단 배너 — Undo(삭제 취소) / 저장 성공 / 저장 실패(롤백 안내) */}
      {banner && (
        <SafeAreaView edges={['bottom']} style={styles.bannerWrap}>
          <View
            style={[
              styles.banner,
              banner.kind === 'error' && styles.bannerError,
              banner.kind === 'success' && styles.bannerSuccess,
            ]}
          >
            <Text style={styles.bannerText} numberOfLines={2}>
              {banner.kind === 'undo'
                ? `${banner.item.restaurant.name} 삭제됨`
                : banner.message}
            </Text>
            {banner.kind === 'undo' && (
              <TouchableOpacity onPress={handleUndo} hitSlop={8}>
                <Text style={styles.bannerAction}>실행취소</Text>
              </TouchableOpacity>
            )}
          </View>
        </SafeAreaView>
      )}

      {course && (
        <AddRestaurantSheet
          visible={addSheetVisible}
          courseId={course.id}
          onClose={() => setAddSheetVisible(false)}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: THEME.white },
  flex: { flex: 1 },

  // Nav
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: THEME.gray100,
  },
  navBtn: { minWidth: 56, alignItems: 'flex-end' },
  navBtnText: { fontSize: 14, color: THEME.gray500 },
  navTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    color: THEME.ink,
  },
  saveBtn: {
    minWidth: 56,
    alignItems: 'flex-end',
    backgroundColor: 'transparent',
  },
  saveBtnDisabled: { opacity: 1 },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: THEME.coral },
  saveBtnTextDisabled: { color: THEME.gray300 },

  // Author chip (§3.3 동선 1: 코스 작성자 탭 → 프로필)
  authorRow: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 2 },
  authorText: { fontSize: 12, color: THEME.gray500, fontWeight: '600' },

  // States
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  stateTitle: { fontSize: 15, fontWeight: '600', color: THEME.ink, marginBottom: 6 },
  stateText: { fontSize: 13, color: THEME.gray400, marginTop: 6, textAlign: 'center' },
  retryBtn: {
    marginTop: 16,
    backgroundColor: THEME.coral,
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  retryText: { color: THEME.white, fontSize: 14, fontWeight: '600' },

  // Map
  mapPlaceholder: {
    backgroundColor: THEME.mapBg,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // List
  listContent: { paddingHorizontal: 16, paddingBottom: 24 },
  sectionHeader: { marginTop: 16, marginBottom: 8 },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: THEME.ink },
  sectionHint: { fontSize: 11, color: THEME.gray400, marginTop: 3 },
  emptyBox: { alignItems: 'center', paddingVertical: 40 },

  // Add place bar (Phase 4)
  addPlaceBar: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: THEME.gray100,
    backgroundColor: THEME.white,
  },
  addPlaceBtn: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: THEME.gray200,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  addPlaceBtnText: { fontSize: 13, fontWeight: '600', color: THEME.gray500 },

  // Banner (Phase 5) — 새 토스트 라이브러리 없이 직접 구현한 하단 배너
  bannerWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: THEME.ink,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
      android: { elevation: 6 },
    }),
  },
  bannerSuccess: { backgroundColor: THEME.coral },
  bannerError: { backgroundColor: THEME.deleteRed },
  bannerText: { flex: 1, color: THEME.white, fontSize: 13, fontWeight: '500' },
  bannerAction: { color: THEME.white, fontSize: 13, fontWeight: '700' },
});
