/**
 * PlaceCard
 * Used as the render item inside DraggableFlatList.
 * Wraps SwipeableRow and shows place info + drag handle.
 */
import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { RenderItemParams } from 'react-native-draggable-flatlist';
import type { CoursePlace } from '@/types/course';
import { SwipeableRow } from './SwipeableRow';
import { THEME } from '@/constants/theme';

const PRICE_SYMBOL = '₩';

interface Props extends RenderItemParams<CoursePlace> {
  index: number;
  onDelete: (id: string) => void;
}

export function PlaceCard({ item: place, drag, isActive, index, onDelete }: Props) {
  return (
    <SwipeableRow onDelete={() => onDelete(place.id)}>
      <View style={[styles.card, isActive && styles.cardActive]}>
        {/* Index badge */}
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{index + 1}</Text>
        </View>

        {/* Thumbnail */}
        {place.imageUrl ? (
          <Image source={{ uri: place.imageUrl }} style={styles.thumb} />
        ) : (
          <View style={[styles.thumb, styles.thumbPlaceholder]} />
        )}

        {/* Info */}
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>{place.name}</Text>
          <Text style={styles.meta}>
            ★ {place.rating}  ·  {place.distance}
          </Text>
          <Text style={styles.category}>
            {place.category}  ·  {PRICE_SYMBOL.repeat(place.priceLevel)}
          </Text>
        </View>

        {/* Drag handle */}
        <TouchableOpacity onLongPress={drag} style={styles.handle}>
          <View style={styles.handleDot} />
          <View style={styles.handleDot} />
          <View style={styles.handleDot} />
          <View style={styles.handleDot} />
          <View style={styles.handleDot} />
          <View style={styles.handleDot} />
        </TouchableOpacity>
      </View>
    </SwipeableRow>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.white,
    borderWidth: 1,
    borderColor: THEME.gray100,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    gap: 10,
  },
  cardActive: {
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
    opacity: 0.9,
  },
  badge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: THEME.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: THEME.white,
    fontSize: 11,
    fontWeight: '700',
  },
  thumb: {
    width: 48,
    height: 48,
    borderRadius: 8,
  },
  thumbPlaceholder: {
    backgroundColor: THEME.gray100,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.ink,
  },
  meta: {
    fontSize: 11,
    color: THEME.gray400,
  },
  category: {
    fontSize: 11,
    color: THEME.gray400,
  },
  handle: {
    paddingHorizontal: 4,
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 18,
    gap: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  handleDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: THEME.coral,
  },
});
