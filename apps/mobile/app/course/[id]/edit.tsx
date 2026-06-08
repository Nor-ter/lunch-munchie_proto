/**
 * app/course/[id]/edit.tsx
 *
 * Course map edit screen.
 *
 * Layout
 * ┌─────────────────────────┐
 * │  Nav bar                │
 * ├─────────────────────────┤
 * │  SVG map preview        │  ← CourseMapSvg, updates live
 * ├─────────────────────────┤
 * │  DraggableFlatList      │  ← PlaceCard (swipe to delete)
 * │  + Add button           │
 * ├─────────────────────────┤
 * │  Cancel | Share         │  ← fixed bottom bar
 * └─────────────────────────┘
 *
 * State: useReducer (EditState / EditAction defined in types/course.ts)
 * After delete: NearbyPlaceSheet opens with coords of deleted place
 *
 * NOTE: @rnmapbox/maps and react-native-skia require EAS Build (native
 *       modules). This screen uses react-native-svg for the map preview
 *       and defers Mapbox / Skia usage to child screens.
 */

import React, { useCallback, useReducer, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
  Alert,
  ScrollView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import DraggableFlatList, {
  ScaleDecorator,
} from 'react-native-draggable-flatlist';
import { MOCK_COURSE } from '@/data/mockCourse';
import {
  editReducer,
  type CoursePlace,
  type EditAction,
  type LatLng,
} from '@/types/course';
import { CourseMapSvg } from '@/components/CourseMapSvg';
import { PlaceCard } from '@/components/PlaceCard';
import { NearbyPlaceSheet } from '@/components/NearbyPlaceSheet';
import { useCourseStore } from '@/store/useCourseStore';
import { THEME } from '@/constants/theme';

// ── helpers ──────────────────────────────────────────────────────────────────

function initState(course: typeof MOCK_COURSE) {
  return {
    title: course.title,
    hashtags: [...course.hashtags],
    places: course.places.map(p => ({ ...p })),
    isDirty: false,
  };
}

// ── Screen ───────────────────────────────────────────────────────────────────

export default function CourseEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width } = useWindowDimensions();
  const updateCourse = useCourseStore(s => s.updateCourse);

  // Pull course from store or fall back to mock
  const storedCourse = useCourseStore(s => s.courses.find(c => c.id === id)) ?? MOCK_COURSE;
  const original = useRef(storedCourse).current;

  const [state, dispatch] = useReducer(editReducer, original, initState);
  const [newTag, setNewTag] = useState('');
  const [isAddingTag, setIsAddingTag] = useState(false);

  // Nearby sheet
  const [sheetVisible, setSheetVisible] = useState(false);
  const [searchCoords, setSearchCoords] = useState<LatLng | null>(null);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleReorder = useCallback(({ data }: { data: CoursePlace[] }) => {
    dispatch({ type: 'REORDER', places: data });
  }, []);

  const handleDelete = useCallback((deletedPlace: CoursePlace) => {
    dispatch({ type: 'REMOVE', id: deletedPlace.id });
    // Open sheet with the deleted place's coords as search origin
    setSearchCoords(deletedPlace.coords);
    setSheetVisible(true);
  }, []);

  const handleAddNearby = useCallback((place: CoursePlace) => {
    dispatch({ type: 'ADD', place });
  }, []);

  const handleSave = () => {
    updateCourse({
      ...original,
      title: state.title,
      hashtags: state.hashtags,
      places: state.places,
    });
    router.back();
  };

  const handleCancel = () => {
    if (state.isDirty) {
      Alert.alert('변경 사항 취소', '편집 내용을 버리고 나가시겠어요?', [
        { text: '계속 편집', style: 'cancel' },
        {
          text: '나가기',
          style: 'destructive',
          onPress: () => {
            dispatch({ type: 'RESET', original });
            router.back();
          },
        },
      ]);
    } else {
      router.back();
    }
  };

  const commitTag = () => {
    const t = newTag.trim().replace(/^#/, '');
    if (t && !state.hashtags.includes(t)) {
      dispatch({ type: 'TOGGLE_TAG', tag: t });
    }
    setNewTag('');
    setIsAddingTag(false);
  };

  const mapWidth = width;
  const mapHeight = 220;

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Nav bar */}
      <View style={styles.navBar}>
        <TouchableOpacity onPress={handleCancel} style={styles.navBtn}>
          <Text style={styles.navBtnText}>취소</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle}>코스 편집</Text>
        <TouchableOpacity onPress={handleSave} style={styles.saveBtn}>
          <Text style={styles.saveBtnText}>저장</Text>
        </TouchableOpacity>
      </View>

      {/* Map preview — always visible above list */}
      <View style={{ width: mapWidth, height: mapHeight }}>
        <CourseMapSvg places={state.places} width={mapWidth} height={mapHeight} />
      </View>

      {/* Scrollable content below map */}
      <View style={styles.flex}>
        <DraggableFlatList
          data={state.places}
          keyExtractor={item => item.id}
          onDragEnd={handleReorder}
          activationDistance={10}
          containerStyle={styles.listContainer}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <View>
              {/* Title input */}
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>코스 제목</Text>
                <TextInput
                  value={state.title}
                  onChangeText={t => dispatch({ type: 'SET_TITLE', title: t })}
                  style={styles.titleInput}
                  placeholder="코스 이름을 입력하세요"
                  placeholderTextColor={THEME.gray300}
                  returnKeyType="done"
                />
              </View>

              {/* Hashtags */}
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>해시태그</Text>
                <View style={styles.tagsRow}>
                  {state.hashtags.map(tag => (
                    <TouchableOpacity
                      key={tag}
                      style={styles.tagChip}
                      onPress={() => dispatch({ type: 'TOGGLE_TAG', tag })}
                    >
                      <Text style={styles.tagText}>#{tag}</Text>
                      <Text style={styles.tagRemove}> ✕</Text>
                    </TouchableOpacity>
                  ))}
                  {isAddingTag ? (
                    <TextInput
                      value={newTag}
                      onChangeText={setNewTag}
                      onBlur={commitTag}
                      onSubmitEditing={commitTag}
                      autoFocus
                      style={styles.tagInput}
                      placeholder="#태그"
                      placeholderTextColor={THEME.gray300}
                      returnKeyType="done"
                    />
                  ) : (
                    <TouchableOpacity
                      style={styles.tagAddChip}
                      onPress={() => setIsAddingTag(true)}
                    >
                      <Text style={styles.tagAddText}>+ 추가</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* List header */}
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>
                  장소 · {state.places.length}개 (최대 4)
                </Text>
                <Text style={styles.sectionHint}>길게 누르고 드래그해서 순서 변경</Text>
              </View>
            </View>
          }
          ListFooterComponent={
            state.places.length < 4 ? (
              <TouchableOpacity
                style={styles.addPlaceBtn}
                onPress={() => {
                  // Use centroid of current places as search origin
                  const lat = state.places.reduce((s, p) => s + p.coords.lat, 0) / (state.places.length || 1);
                  const lng = state.places.reduce((s, p) => s + p.coords.lng, 0) / (state.places.length || 1);
                  setSearchCoords({ lat, lng });
                  setSheetVisible(true);
                }}
              >
                <Text style={styles.addPlaceBtnText}>+ 식당 추가 (주변 탐색)</Text>
              </TouchableOpacity>
            ) : null
          }
          renderItem={({ item, drag, isActive, getIndex }) => (
            <ScaleDecorator>
              <PlaceCard
                item={item}
                drag={drag}
                isActive={isActive}
                getIndex={getIndex}
                index={getIndex() ?? 0}
                onDelete={() => handleDelete(item)}
              />
            </ScaleDecorator>
          )}
        />
      </View>

      {/* Fixed bottom bar */}
      <SafeAreaView edges={['bottom']} style={styles.bottomBar}>
        <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
          <Text style={styles.cancelBtnText}>취소</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.shareBtn}
          onPress={() => router.push(`/course/${id}/share`)}
        >
          <Text style={styles.shareBtnText}>공유하기</Text>
        </TouchableOpacity>
      </SafeAreaView>

      {/* Nearby alternatives sheet */}
      <NearbyPlaceSheet
        visible={sheetVisible}
        searchCoords={searchCoords}
        onSelect={handleAddNearby}
        onClose={() => setSheetVisible(false)}
      />
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: THEME.white,
  },
  flex: {
    flex: 1,
  },

  // Nav
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: THEME.gray100,
  },
  navBtn: { minWidth: 48 },
  navBtnText: { fontSize: 14, color: THEME.gray500 },
  navTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    color: THEME.ink,
  },
  saveBtn: {
    backgroundColor: THEME.coral,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  saveBtnText: { color: THEME.white, fontSize: 13, fontWeight: '600' },

  // List
  listContainer: { flex: 1 },
  listContent: { paddingHorizontal: 16, paddingBottom: 16 },

  // Fields
  fieldRow: { marginTop: 16 },
  fieldLabel: { fontSize: 11, color: THEME.gray400, marginBottom: 6 },
  titleInput: {
    borderWidth: 1,
    borderColor: THEME.gray200,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: THEME.ink,
  },

  // Tags
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.gray200,
    borderRadius: 99,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  tagText: { fontSize: 12, color: THEME.ink },
  tagRemove: { fontSize: 10, color: THEME.gray400 },
  tagInput: {
    borderWidth: 1,
    borderColor: THEME.coral,
    borderRadius: 99,
    paddingHorizontal: 10,
    paddingVertical: 5,
    fontSize: 12,
    minWidth: 72,
    color: THEME.ink,
  },
  tagAddChip: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: THEME.gray300,
    borderRadius: 99,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  tagAddText: { fontSize: 12, color: THEME.gray400 },

  // Section header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 8,
  },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: THEME.ink },
  sectionHint: { fontSize: 11, color: THEME.gray400 },

  // Add place
  addPlaceBtn: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: THEME.gray200,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  addPlaceBtnText: { fontSize: 13, color: THEME.gray400 },

  // Bottom bar
  bottomBar: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: THEME.gray100,
    backgroundColor: THEME.white,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: -2 },
      },
      android: { elevation: 4 },
    }),
  },
  cancelBtn: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: THEME.gray200,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: { fontSize: 14, color: THEME.gray500 },
  shareBtn: {
    flex: 1,
    height: 44,
    backgroundColor: THEME.coral,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareBtnText: { fontSize: 14, fontWeight: '600', color: THEME.white },
});
