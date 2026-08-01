/**
 * Template 2 – "미니멀"
 * 1:1 ratio · white bg · large title + clean map (no grid)
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MapSvgCard } from './MapSvgCard';
import { THEME } from '@/constants/theme';
import type { Course } from '@/types/course';

export const MINIMAL_W = 270;
export const MINIMAL_H = 270;

interface Props { course: Course }

export function TemplateMinimal({ course }: Props) {
  const mapSize = MINIMAL_W - 40;
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{course.title}</Text>
      <View style={styles.mapWrap}>
        <MapSvgCard
          places={course.places}
          width={mapSize}
          height={mapSize - 40}
          showGrid={false}
          bgColor={THEME.gray50}
        />
      </View>
      <Text style={styles.hint}>
        {course.hashtags.map(t => `#${t}`).join(' ')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: MINIMAL_W,
    height: MINIMAL_H,
    backgroundColor: THEME.white,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  title: { fontSize: 18, fontWeight: '800', color: THEME.ink, textAlign: 'center' },
  mapWrap: { borderRadius: 10, overflow: 'hidden' },
  hint: { fontSize: 9, color: THEME.gray400, textAlign: 'center' },
});
