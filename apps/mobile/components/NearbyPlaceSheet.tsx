/**
 * NearbyPlaceSheet
 * A simple bottom sheet that shows Google Places nearby results.
 * Appears after a place is deleted. User taps a result to insert it.
 */
import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Modal,
  Pressable,
  Image,
} from 'react-native';
import type { CoursePlace, LatLng } from '@/types/course';
import { useNearbyPlaces } from '@/hooks/useNearbyPlaces';
import { THEME } from '@/constants/theme';

interface Props {
  visible: boolean;
  searchCoords: LatLng | null;
  onSelect: (place: CoursePlace) => void;
  onClose: () => void;
}

export function NearbyPlaceSheet({ visible, searchCoords, onSelect, onClose }: Props) {
  const { data, isLoading, isError } = useNearbyPlaces(visible ? searchCoords : null);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose} />

      <View style={styles.sheet}>
        {/* Handle */}
        <View style={styles.sheetHandle} />

        <Text style={styles.sheetTitle}>이 근처 대안 찾기</Text>
        <Text style={styles.sheetSub}>삭제한 장소 근처의 식당을 추천해드려요</Text>

        {isLoading && (
          <ActivityIndicator color={THEME.coral} size="large" style={{ marginTop: 24 }} />
        )}

        {isError && (
          <Text style={styles.errorText}>
            장소 데이터를 불러올 수 없어요.{'\n'}API 키를 확인해주세요.
          </Text>
        )}

        {!isLoading && !isError && (
          <FlatList
            data={data ?? []}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <Text style={styles.emptyText}>주변 식당을 찾을 수 없어요.</Text>
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.resultCard}
                onPress={() => { onSelect(item); onClose(); }}
                activeOpacity={0.75}
              >
                {item.imageUrl ? (
                  <Image source={{ uri: item.imageUrl }} style={styles.resultThumb} />
                ) : (
                  <View style={[styles.resultThumb, styles.resultThumbPlaceholder]} />
                )}
                <View style={styles.resultInfo}>
                  <Text style={styles.resultName}>{item.name}</Text>
                  <Text style={styles.resultMeta}>
                    ★ {item.rating}  ·  {item.category}
                  </Text>
                </View>
                <View style={styles.addBtn}>
                  <Text style={styles.addBtnText}>추가</Text>
                </View>
              </TouchableOpacity>
            )}
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  sheet: {
    backgroundColor: THEME.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 40,
    maxHeight: '60%',
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: THEME.gray200,
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.ink,
  },
  sheetSub: {
    fontSize: 12,
    color: THEME.gray400,
    marginTop: 4,
    marginBottom: 16,
  },
  list: {
    paddingBottom: 16,
  },
  resultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: THEME.gray100,
  },
  resultThumb: {
    width: 44,
    height: 44,
    borderRadius: 8,
  },
  resultThumbPlaceholder: {
    backgroundColor: THEME.gray100,
  },
  resultInfo: {
    flex: 1,
  },
  resultName: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.ink,
  },
  resultMeta: {
    fontSize: 11,
    color: THEME.gray400,
    marginTop: 2,
  },
  addBtn: {
    backgroundColor: THEME.coral,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  addBtnText: {
    color: THEME.white,
    fontSize: 12,
    fontWeight: '600',
  },
  errorText: {
    textAlign: 'center',
    color: THEME.gray400,
    fontSize: 13,
    marginTop: 24,
    lineHeight: 20,
  },
  emptyText: {
    textAlign: 'center',
    color: THEME.gray400,
    fontSize: 13,
    marginTop: 24,
  },
});
