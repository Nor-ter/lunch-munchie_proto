/**
 * AddRestaurantSheet — 식당 추가 바텀시트 (Phase 4).
 *
 * 흐름(워크플로우 §5 add):
 *   입력 → (debounce) autocomplete 후보 표시 → 후보 탭 → place-details **1회만** 호출
 *   → restaurants upsert(내부 id 확보, Edge Function이 처리) → editStore.addItem 으로
 *   draft 에 새 course_item(restaurant_id + 임시 order_index) append, dirty=true.
 *
 * 제약: 리스트 스크롤/타이핑마다 Details 호출 금지 — usePlacesSearch 는 autocomplete만
 * 반복 호출하고, place-details 는 이 컴포넌트의 handleSelect 에서 탭 시 딱 1번만 부른다.
 *
 * 바텀시트는 NearbyPlaceSheet 와 동일하게 core RN Modal 사용 — 새 바텀시트 라이브러리
 * 도입 없음. 스택: TanStack Query(usePlacesSearch), Zustand(editStore), Modal(RN core).
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Modal,
  Pressable,
} from 'react-native';
import { useEditStore } from '@/store/editStore';
import { usePlacesSearch } from '@/hooks/usePlacesSearch';
import { getPlaceDetails, type Bias, type PlaceSuggestion } from '@/services/placesApi';
import { describeApiError } from '@/lib/apiErrorMessage';
import type { CourseItemWithRestaurant } from '@/types/db';
import { THEME } from '@/constants/theme';

interface Props {
  visible: boolean;
  courseId: string;
  onClose: () => void;
}

function generateDraftItemId(): string {
  return `draft_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

export function AddRestaurantSheet({ visible, courseId, onClose }: Props) {
  const draftItems = useEditStore((s) => s.draftItems);
  const addItem = useEditStore((s) => s.addItem);

  // 워크플로우 §4 add 흐름 4: 코스 첫 item 좌표가 있으면 그 좌표로 바이어스, 없으면 서버가 Melbourne 기본.
  const firstRestaurant = draftItems[0]?.restaurant;
  const bias: Bias | undefined = firstRestaurant
    ? { lat: firstRestaurant.latitude, lng: firstRestaurant.longitude }
    : undefined;

  const { input, setInput, sessionToken, suggestions, isLoading, isError, error, endSession, reset } =
    usePlacesSearch(bias);

  // 선택 후 place-details 진행 중인 placeId (해당 행만 로딩 표시 + 중복 탭 방지)
  const [selectingId, setSelectingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleClose = () => {
    reset();
    setSelectingId(null);
    setErrorMessage(null);
    onClose();
  };

  const handleSelect = async (suggestion: PlaceSuggestion) => {
    if (selectingId) return; // 이미 place-details 진행 중이면 추가 탭 무시(중복 호출 방지)
    setSelectingId(suggestion.placeId);
    setErrorMessage(null);
    try {
      // place-details — 선택 시 1회만 호출(제약).
      const restaurant = await getPlaceDetails(suggestion.placeId, sessionToken);
      const newItem: CourseItemWithRestaurant = {
        id: generateDraftItemId(),
        course_id: courseId,
        restaurant_id: restaurant.id,
        order_index: draftItems.length, // addItem 이 어차피 0..n-1 로 재정규화
        start_time: null,
        end_time: null,
        is_bookmarked: false,
        memo: null,
        created_at: new Date().toISOString(),
        restaurant,
      };
      addItem(newItem);
      endSession(); // 세션 종료 — 다음 검색은 새 세션 토큰으로
      handleClose();
    } catch (err) {
      setErrorMessage(describeApiError(err));
      setSelectingId(null);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <Pressable style={styles.backdrop} onPress={handleClose} />

      <View style={styles.sheet}>
        <View style={styles.sheetHandle} />

        <Text style={styles.sheetTitle}>식당 추가</Text>
        <Text style={styles.sheetSub}>이름으로 검색해서 코스에 추가해 보세요</Text>

        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="예: Brother Baba Budan"
          placeholderTextColor={THEME.gray300}
          style={styles.searchInput}
          autoFocus
          returnKeyType="search"
        />

        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

        {isLoading && (
          <ActivityIndicator color={THEME.coral} size="small" style={{ marginTop: 16 }} />
        )}

        {isError && !isLoading && (
          <Text style={styles.errorText}>{describeApiError(error)}</Text>
        )}

        {!isLoading && !isError && (
          <FlatList
            data={suggestions}
            keyExtractor={(item) => item.placeId}
            style={styles.list}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              input.trim().length >= 2 ? (
                <Text style={styles.emptyText}>검색 결과가 없어요.</Text>
              ) : (
                <Text style={styles.emptyText}>2글자 이상 입력해 주세요.</Text>
              )
            }
            renderItem={({ item }) => {
              const busy = selectingId === item.placeId;
              return (
                <TouchableOpacity
                  style={styles.resultRow}
                  onPress={() => handleSelect(item)}
                  disabled={!!selectingId}
                  activeOpacity={0.75}
                >
                  <Text style={styles.resultText} numberOfLines={1}>
                    {item.text}
                  </Text>
                  {busy ? (
                    <ActivityIndicator color={THEME.coral} size="small" />
                  ) : (
                    <View style={[styles.addBtn, selectingId ? styles.addBtnDisabled : null]}>
                      <Text style={styles.addBtnText}>추가</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            }}
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
  sheetTitle: { fontSize: 16, fontWeight: '700', color: THEME.ink },
  sheetSub: { fontSize: 12, color: THEME.gray400, marginTop: 4, marginBottom: 14 },
  searchInput: {
    borderWidth: 1,
    borderColor: THEME.gray200,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: THEME.ink,
  },
  list: { marginTop: 10 },
  listContent: { paddingBottom: 8 },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: THEME.gray100,
    gap: 10,
  },
  resultText: { flex: 1, fontSize: 13, color: THEME.ink },
  addBtn: {
    backgroundColor: THEME.coral,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  addBtnDisabled: { opacity: 0.4 },
  addBtnText: { color: THEME.white, fontSize: 12, fontWeight: '600' },
  errorText: {
    textAlign: 'center',
    color: THEME.deleteRed,
    fontSize: 12,
    marginTop: 10,
    lineHeight: 18,
  },
  emptyText: {
    textAlign: 'center',
    color: THEME.gray400,
    fontSize: 13,
    marginTop: 20,
  },
});
