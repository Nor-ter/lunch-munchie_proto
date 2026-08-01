/**
 * Template 5 – "배경 포함"
 * 9:16 ratio · blurred first-place image bg · title + map overlay.
 * When no imageUrl is available, falls back to coral gradient-like solid.
 */
import React from 'react';
import { View, Text, ImageBackground, StyleSheet } from 'react-native';
import { MapSvgCard } from './MapSvgCard';
import { THEME } from '@/constants/theme';
import type { Course } from '@/types/course';

export const BG_W = 270;
export const BG_H = 480;

interface Props { course: Course }

export function TemplateBg({ course }: Props) {
  const bgImage = course.places.find(p => p.imageUrl)?.imageUrl;
  const mapW = BG_W - 32;

  const content = (
    <View style={styles.overlay}>
      {/* Top left label */}
      <Text style={styles.label}>MY COURSE</Text>

      {/* Title */}
      <Text style={styles.title}>{course.title}</Text>
      <Text style={styles.sub}>
        {course.hashtags.map(t => `#${t}`).join(' ')}
      </Text>

      {/* Map */}
      <View style={styles.mapWrap}>
        <MapSvgCard
          places={course.places}
          width={mapW}
          height={180}
          showGrid={false}
          bgColor="rgba(255,255,255,0.15)"
          markerColor={THEME.white}
          routeColor={THEME.white}
        />
      </View>

      {/* Footer */}
      <Text style={styles.brand}>Lunchie Munchie</Text>
    </View>
  );

  if (bgImage) {
    return (
      <ImageBackground
        source={{ uri: bgImage }}
        style={styles.card}
        imageStyle={styles.bgImage}
        blurRadius={8}
      >
        {content}
      </ImageBackground>
    );
  }

  // Fallback: solid coral background
  return (
    <View style={[styles.card, styles.fallbackBg]}>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: BG_W,
    height: BG_H,
    borderRadius: 16,
    overflow: 'hidden',
  },
  bgImage: { borderRadius: 16 },
  fallbackBg: { backgroundColor: THEME.coral },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    padding: 20,
    justifyContent: 'center',
    gap: 8,
  },
  label: { fontSize: 9, color: 'rgba(255,255,255,0.6)', letterSpacing: 2, fontWeight: '700' },
  title: { fontSize: 24, fontWeight: '800', color: THEME.white, lineHeight: 30 },
  sub: { fontSize: 10, color: 'rgba(255,255,255,0.7)' },
  mapWrap: { borderRadius: 10, overflow: 'hidden', marginTop: 8 },
  brand: { fontSize: 9, color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginTop: 8, letterSpacing: 1 },
});
