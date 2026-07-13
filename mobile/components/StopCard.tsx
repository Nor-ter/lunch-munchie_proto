/**
 * StopCard — 코스 stop 한 개(=course_items ⨝ restaurants)를 읽기 전용으로 표시.
 *
 * Phase 1: 표시 전용(드래그·스와이프 없음). Phase 2에서 편집 인터랙션을 이 카드 위에
 * (또는 래핑해) 얹는다. 재사용 가능하도록 순수 표시 컴포넌트로 분리했다.
 *
 * §3.2: rating/review_count 가 0 이면 "평점 없음"으로 표기(Google 미제공 기본값 0/2).
 * 스타일: 프로젝트 하우스 스타일(StyleSheet + THEME). 새 라이브러리 없음.
 */
import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import type { CourseItemWithRestaurant } from '@/types/db';
import { THEME } from '@/constants/theme';

interface Props {
  item: CourseItemWithRestaurant;
  /** 표시 순번 (0-based) → 뱃지에 index+1 */
  index: number;
  /** 카드 우측 슬롯 (편집 모드의 드래그 핸들 등). Phase 1 표시에서는 미지정 → 렌더 안 함. */
  rightSlot?: React.ReactNode;
  /** 드래그 중 강조 (DraggableFlatList isActive) */
  active?: boolean;
}

const PRICE_SYMBOL = '₩';

export function StopCard({ item, index, rightSlot, active }: Props) {
  const r = item.restaurant;
  const thumb = r.photos?.[0];
  const hasRating = r.review_count > 0 && r.rating > 0;
  const price = r.price_level > 0 ? PRICE_SYMBOL.repeat(r.price_level) : null;

  return (
    <View style={[styles.card, active && styles.cardActive]}>
      {/* 순번 뱃지 */}
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{index + 1}</Text>
      </View>

      {/* 썸네일 */}
      {thumb ? (
        <Image source={{ uri: thumb }} style={styles.thumb} />
      ) : (
        <View style={[styles.thumb, styles.thumbPlaceholder]} />
      )}

      {/* 정보 */}
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {r.name}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {hasRating ? `★ ${r.rating.toFixed(1)}` : '평점 없음'}
          {'  ·  '}
          {r.category}
          {price ? `  ·  ${price}` : ''}
        </Text>
        <Text style={styles.address} numberOfLines={1}>
          {r.address}
        </Text>
        {item.memo ? (
          <Text style={styles.memo} numberOfLines={1}>
            📝 {item.memo}
          </Text>
        ) : null}
      </View>

      {/* 우측 슬롯 (편집 모드 드래그 핸들 등) */}
      {rightSlot ? <View style={styles.right}>{rightSlot}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.white,
    borderWidth: 1,
    borderColor: THEME.gray100,
    borderRadius: 14,
    padding: 10,
    marginBottom: 10,
  },
  cardActive: {
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
    borderColor: THEME.coral,
  },
  right: { marginLeft: 8 },
  badge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: THEME.coral,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  badgeText: { color: THEME.white, fontSize: 12, fontWeight: '700' },
  thumb: { width: 52, height: 52, borderRadius: 10, marginRight: 12 },
  thumbPlaceholder: { backgroundColor: THEME.gray100 },
  info: { flex: 1, minWidth: 0 },
  name: { fontSize: 14, fontWeight: '600', color: THEME.ink },
  meta: { fontSize: 12, color: THEME.gray500, marginTop: 2 },
  address: { fontSize: 11, color: THEME.gray400, marginTop: 2 },
  memo: { fontSize: 11, color: THEME.gray500, marginTop: 3 },
});
