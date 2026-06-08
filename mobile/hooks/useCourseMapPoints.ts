/**
 * useCourseMapPoints
 * Shared normalisation logic: LatLng coords → SVG pixel coords.
 * Used by CourseMapSvg (edit screen) and share templates.
 */
import { useMemo } from 'react';
import type { CoursePlace } from '@/types/course';

export const PAD = 0.12; // 12% padding around the bounding box

export interface MappedPoint extends CoursePlace {
  sx: number;
  sy: number;
}

export function normalisePlaces(
  places: CoursePlace[],
  w: number,
  h: number,
): MappedPoint[] {
  if (places.length === 0) return [];

  const lats = places.map(p => p.coords.lat);
  const lngs = places.map(p => p.coords.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const dLat = maxLat - minLat || 0.001;
  const dLng = maxLng - minLng || 0.001;

  return places.map(p => ({
    ...p,
    sx: ((p.coords.lng - minLng) / dLng) * (1 - 2 * PAD) * w + PAD * w,
    sy: (1 - (p.coords.lat - minLat) / dLat) * (1 - 2 * PAD) * h + PAD * h,
  }));
}

export function useCourseMapPoints(
  places: CoursePlace[],
  w: number,
  h: number,
): MappedPoint[] {
  return useMemo(() => normalisePlaces(places, w, h), [places, w, h]);
}
