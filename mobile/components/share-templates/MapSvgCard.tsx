/**
 * MapSvgCard – lightweight SVG course map used inside share templates.
 * Supports two modes:
 *   showGrid=true  → filled background + grid lines (같은 edit 화면 스타일)
 *   showGrid=false → transparent background, route + markers only
 */
import React from 'react';
import Svg, { Rect, Line, Polyline, Circle, Text as SvgText } from 'react-native-svg';
import { useCourseMapPoints } from '@/hooks/useCourseMapPoints';
import type { CoursePlace } from '@/types/course';
import { THEME } from '@/constants/theme';

const GRID_STEPS = [10, 20, 30, 40, 50, 60, 70, 80, 90];

interface Props {
  places: CoursePlace[];
  width: number;
  height: number;
  showGrid?: boolean;    // default true
  bgColor?: string;      // override background fill
  markerColor?: string;  // default ink
  routeColor?: string;   // default coral
}

export function MapSvgCard({
  places,
  width,
  height,
  showGrid = true,
  bgColor,
  markerColor = THEME.ink,
  routeColor = THEME.coral,
}: Props) {
  const pts = useCourseMapPoints(places, width, height);
  const polylinePoints = pts.map(p => `${p.sx},${p.sy}`).join(' ');
  const bg = bgColor ?? (showGrid ? THEME.mapBg : 'transparent');

  return (
    <Svg width={width} height={height}>
      <Rect width={width} height={height} fill={bg} />

      {showGrid && GRID_STEPS.map(s => (
        <React.Fragment key={s}>
          <Line x1={(s / 100) * width} y1={0} x2={(s / 100) * width} y2={height}
            stroke={THEME.mapGrid} strokeWidth={0.5} />
          <Line x1={0} y1={(s / 100) * height} x2={width} y2={(s / 100) * height}
            stroke={THEME.mapGrid} strokeWidth={0.5} />
        </React.Fragment>
      ))}

      {pts.length > 1 && (
        <Polyline
          points={polylinePoints}
          stroke={routeColor}
          strokeWidth={2.5}
          strokeDasharray="7,5"
          fill="none"
        />
      )}

      {pts.map((p, i) => (
        <React.Fragment key={p.id}>
          <Circle cx={p.sx} cy={p.sy} r={13} fill={markerColor} />
          <SvgText x={p.sx} y={p.sy} fill={THEME.white} fontSize={10}
            fontWeight="bold" textAnchor="middle" dy="4">
            {i + 1}
          </SvgText>
        </React.Fragment>
      ))}
    </Svg>
  );
}
