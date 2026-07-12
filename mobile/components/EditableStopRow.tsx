/**
 * EditableStopRow — 편집 모드의 stop 행.
 *
 * 순수 표시용 StopCard 를 재사용하면서(Phase 1 read-only 유지), 편집 인터랙션만 합성한다:
 *   · swipe-to-delete  → 기존 SwipeableRow(gesture-handler + reanimated) 재사용
 *   · drag-to-reorder  → 우측 드래그 핸들 long-press → DraggableFlatList 의 drag()
 *
 * 새 제스처 라이브러리 없음(SwipeableRow/draggable-flatlist 재사용). 스택 constitution 준수.
 */
import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import type { CourseItemWithRestaurant } from '@/types/db';
import { StopCard } from './StopCard';
import { SwipeableRow } from './SwipeableRow';
import { THEME } from '@/constants/theme';

interface Props {
  item: CourseItemWithRestaurant;
  index: number;
  /** DraggableFlatList 의 drag 트리거 (long-press 로 시작) */
  drag: () => void;
  isActive: boolean;
  onDelete: () => void;
}

export function EditableStopRow({ item, index, drag, isActive, onDelete }: Props) {
  return (
    <SwipeableRow onDelete={onDelete}>
      <StopCard
        item={item}
        index={index}
        active={isActive}
        rightSlot={
          <TouchableOpacity onLongPress={drag} delayLongPress={150} style={styles.handle}>
            {/* 6-dot 드래그 핸들 */}
            {Array.from({ length: 6 }).map((_, i) => (
              <View key={i} style={styles.dot} />
            ))}
          </TouchableOpacity>
        }
      />
    </SwipeableRow>
  );
}

const styles = StyleSheet.create({
  handle: {
    width: 24,
    height: 32,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingHorizontal: 4,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: THEME.gray300,
  },
});
