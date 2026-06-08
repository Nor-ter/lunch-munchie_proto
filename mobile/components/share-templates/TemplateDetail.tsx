/**
 * Template 4 – "상세"
 * 9:16 ratio · white bg · title + numbered place list
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { THEME } from '@/constants/theme';
import type { Course } from '@/types/course';

export const DETAIL_W = 270;
export const DETAIL_H = 480;

const TIMES = ['12:00', '14:00', '18:00', '20:00'];
const PRICE = '₩';

interface Props { course: Course }

export function TemplateDetail({ course }: Props) {
  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.headerBar} />
      <Text style={styles.title}>{course.title}</Text>
      <Text style={styles.sub}>
        {course.hashtags.map(t => `#${t}`).join('  ')}
      </Text>

      {/* Place list */}
      <View style={styles.list}>
        {course.places.map((p, i) => (
          <View key={p.id} style={styles.row}>
            {/* Number */}
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{i + 1}</Text>
            </View>
            {/* Thumb placeholder */}
            <View style={styles.thumb} />
            {/* Info */}
            <View style={styles.info}>
              <Text style={styles.name} numberOfLines={1}>{p.name}</Text>
              <Text style={styles.meta}>
                {p.category} · {PRICE.repeat(p.priceLevel)}
              </Text>
            </View>
            {/* Time */}
            <Text style={styles.time}>{TIMES[i] ?? ''}</Text>
          </View>
        ))}
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <Text style={styles.stat}>{course.distanceKm}km</Text>
        <Text style={styles.statSep}>·</Text>
        <Text style={styles.stat}>{course.durationHours}시간</Text>
        <Text style={styles.statSep}>·</Text>
        <Text style={styles.stat}>{course.places.length}곳</Text>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.brand}>Lunchie Munchie</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: DETAIL_W,
    height: DETAIL_H,
    backgroundColor: THEME.white,
    borderRadius: 16,
    padding: 20,
  },
  headerBar: {
    height: 3, width: 32, borderRadius: 2,
    backgroundColor: THEME.coral, marginBottom: 14,
  },
  title: { fontSize: 20, fontWeight: '800', color: THEME.ink },
  sub: { fontSize: 10, color: THEME.gray400, marginTop: 4, marginBottom: 20 },
  list: { gap: 14, flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  badge: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: THEME.ink,
    alignItems: 'center', justifyContent: 'center',
  },
  badgeText: { color: THEME.white, fontSize: 10, fontWeight: '700' },
  thumb: { width: 40, height: 40, borderRadius: 8, backgroundColor: THEME.gray100 },
  info: { flex: 1 },
  name: { fontSize: 13, fontWeight: '600', color: THEME.ink },
  meta: { fontSize: 10, color: THEME.gray400, marginTop: 2 },
  time: { fontSize: 11, color: THEME.gray400, minWidth: 36, textAlign: 'right' },
  statsRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingTop: 16, borderTopWidth: 1, borderTopColor: THEME.gray100,
    marginTop: 16,
  },
  stat: { fontSize: 12, fontWeight: '600', color: THEME.ink },
  statSep: { fontSize: 12, color: THEME.gray300 },
  footer: { alignItems: 'center', marginTop: 12 },
  brand: { fontSize: 9, color: THEME.coral, fontWeight: '600', letterSpacing: 1 },
});
