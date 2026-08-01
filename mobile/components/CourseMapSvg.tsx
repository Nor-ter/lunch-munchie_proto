/**
 * CourseMapSvg
 * Renders a grid background, dashed polyline connecting places in order,
 * and numbered circle markers – all using react-native-svg.
 *
 * coords are real LatLng values, projected to SVG space by normalising
 * within the bounding box of all places (+ 10% padding).
 */
import React, { useMemo } from 'react';
import Svg, { Rect, Line, Polyline, Circle, Text as SvgText } from 'react-native-svg';
import type { CoursePlace } from '@/types/course';
import { THEME } from '@/constants/theme';

interface Props {
  places: CoursePlace[];
  width: number;
  height: number;
}

const GRID_STEPS = [10, 20, 30, 40, 50, 60, 70, 80, 90];
const PAD = 0.1; // 10% boundary padding in normalised space

function normalise(places: CoursePlace[], w: number, h: number) {
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
    // lat increases upward, SVG y increases downward
    sy: (1 - (p.coords.lat - minLat) / dLat) * (1 - 2 * PAD) * h + PAD * h,
  }));
}

export function CourseMapSvg({ places, width, height }: Props) {
  const pts = useMemo(() => normalise(places, width, height), [places, width, height]);

  const polylinePoints = pts.map(p => `${p.sx},${p.sy}`).join(' ');

  return (
    <Svg width={width} height={height}>
      {/* Background */}
      <Rect x={0} y={0} width={width} height={height} fill={THEME.mapBg} />

      {/* Grid */}
      {GRID_STEPS.map(s => (
        <React.Fragment key={s}>
          <Line
            x1={(s / 100) * width} y1={0}
            x2={(s / 100) * width} y2={height}
            stroke={THEME.mapGrid} strokeWidth={0.5}
          />
          <Line
            x1={0} y1={(s / 100) * height}
            x2={width} y2={(s / 100) * height}
            stroke={THEME.mapGrid} strokeWidth={0.5}
          />
        </React.Fragment>
      ))}

      {/* Dashed path */}
      {pts.length > 1 && (
        <Polyline
          points={polylinePoints}
          stroke={THEME.coral}
          strokeWidth={2}
          strokeDasharray="6,4"
          fill="none"
        />
      )}

      {/* Markers */}
      {pts.map((p, i) => (
        <React.Fragment key={p.id}>
          <Circle cx={p.sx} cy={p.sy} r={12} fill={THEME.ink} />
          <SvgText
            x={p.sx} y={p.sy}
            fill={THEME.white}
            fontSize={10}
            fontWeight="bold"
            textAnchor="middle"
            dy="4"
          >
            {i + 1}
          </SvgText>
        </React.Fragment>
      ))}

      {/* MAP label */}
      <SvgText x={8} y={14} fill={THEME.gray400} fontSize={9}>MAP</SvgText>
    </Svg>
  );
}
