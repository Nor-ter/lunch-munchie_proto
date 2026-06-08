/**
 * Template 1 – "스토리"
 * 9:16 ratio · white bg · avatar + title + map + quote
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MapSvgCard } from './MapSvgCard';
import { THEME } from '@/constants/theme';
import type { Course } from '@/types/course';

// 9:16 at display scale
export const STORY_W = 270;
export const STORY_H = 480;

interface Props { course: Course }

export function TemplateStory({ course }: Props) {
  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.avatar} />
        <Text style={styles.handle}>@{course.authorHandle}</Text>
        {course.authorBadge && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{course.authorBadge}</Text>
          </View>
        )}
      </View>

      {/* Title */}
      <Text style={styles.title}>{course.title}</Text>
      <Text style={styles.sub}>
        {course.hashtags.map(t => `#${t}`).join(' ')}
      </Text>

      {/* Map */}
      <View style={styles.mapWrap}>
        <MapSvgCard places={course.places} width={STORY_W - 32} height={220} showGrid />
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <Stat label="거리" value={`${course.distanceKm}km`} />
        <View style={styles.statDivider} />
        <Stat label="소요" value={`${course.durationHours}h`} />
        <View style={styles.statDivider} />
        <Stat label="장소" value={`${course.places.length}곳`} />
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <View style={styles.footerLine} />
        <Text style={styles.footerBrand}>Lunchie Munchie</Text>
      </View>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: STORY_W,
    height: STORY_H,
    backgroundColor: THEME.white,
    borderRadius: 16,
    padding: 16,
    justifyContent: 'space-between',
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  avatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: THEME.gray200 },
  handle: { fontSize: 11, color: THEME.gray500, fontWeight: '500' },
  badge: {
    backgroundColor: THEME.coral, borderRadius: 99,
    paddingHorizontal: 6, paddingVertical: 1,
  },
  badgeText: { fontSize: 8, color: THEME.white, fontWeight: '700' },
  title: { fontSize: 22, fontWeight: '800', color: THEME.ink, marginTop: 10, lineHeight: 28 },
  sub: { fontSize: 10, color: THEME.gray400, marginTop: 3 },
  mapWrap: { borderRadius: 10, overflow: 'hidden', marginVertical: 8 },
  statsRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: THEME.gray50,
    borderRadius: 10, paddingVertical: 8,
  },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 13, fontWeight: '700', color: THEME.ink },
  statLabel: { fontSize: 9, color: THEME.gray400, marginTop: 1 },
  statDivider: { width: 1, height: 24, backgroundColor: THEME.gray200 },
  footer: { alignItems: 'center', gap: 6 },
  footerLine: { height: 1, width: '40%', backgroundColor: THEME.coral, opacity: 0.4 },
  footerBrand: { fontSize: 9, color: THEME.coral, fontWeight: '600', letterSpacing: 1 },
});
