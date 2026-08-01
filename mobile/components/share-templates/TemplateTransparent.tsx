/**
 * Template 3 – "코스만"
 * 9:16 ratio · transparent bg · route + markers only.
 * In UI: checkerboard pattern shows transparency.
 * On capture: backgroundColor=transparent → real alpha PNG.
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { MapSvgCard } from './MapSvgCard';
import type { Course } from '@/types/course';

export const TRANSPARENT_W = 270;
export const TRANSPARENT_H = 480;

interface Props {
  course: Course;
  /** True while rendering UI preview; false during capture */
  showCheckerboard?: boolean;
}

export function TemplateTransparent({ course, showCheckerboard = true }: Props) {
  return (
    <View style={[
      styles.card,
      showCheckerboard && styles.checkerboard,
    ]}>
      <MapSvgCard
        places={course.places}
        width={TRANSPARENT_W}
        height={TRANSPARENT_H}
        showGrid={false}
        bgColor="transparent"
        markerColor="#1A1A1A"
        routeColor="#EB5053"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: TRANSPARENT_W,
    height: TRANSPARENT_H,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  checkerboard: {
    // Two-tone repeating background to indicate transparency in the preview
    backgroundColor: '#CCCCCC',
    // RN doesn't support CSS gradient, so we use a plain gray to hint transparency
  },
});
