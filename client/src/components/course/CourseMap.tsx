import { CoursePlace } from '@/types/course';
import {
  COURSE_MAP_ROUTE_STYLE,
  COURSE_THEME,
  getCourseSequenceColor,
} from '@/constants/courseTheme';
import { getCurvedCourseSegments } from '@/lib/courseMapSync';

interface CourseMapProps {
  places: CoursePlace[];
  width?: number;
  height?: number;
  showLabels?: boolean;
  className?: string;
}

const GRID_STEPS = [10, 20, 30, 40, 50, 60, 70, 80, 90];
export const COURSE_MAP_INSET = 18;

export function getCourseMapPositionPercent(value: number, dimension: number) {
  const drawable = Math.max(1, dimension - COURSE_MAP_INSET * 2);
  return ((COURSE_MAP_INSET + (value / 100) * drawable) / dimension) * 100;
}

export function CourseMap({
  places,
  width = 300,
  height = 200,
  showLabels = true,
  className = '',
}: CourseMapProps) {
  const drawableWidth = Math.max(1, width - COURSE_MAP_INSET * 2);
  const drawableHeight = Math.max(1, height - COURSE_MAP_INSET * 2);
  const toX = (x: number) => COURSE_MAP_INSET + (x / 100) * drawableWidth;
  const toY = (y: number) => COURSE_MAP_INSET + (y / 100) * drawableHeight;
  const segments = getCurvedCourseSegments(places.map((place) => place.coords));

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={`rounded-xl overflow-hidden ${className}`}
    >
      {/* Background */}
      <rect width={width} height={height} fill={COURSE_THEME.mapBg} />

      {/* Grid lines */}
      {GRID_STEPS.map((step) => (
        <g key={step}>
          <line
            x1={toX(step)}
            y1={0}
            x2={toX(step)}
            y2={height}
            stroke={COURSE_THEME.mapGrid}
            strokeWidth={0.5}
          />
          <line
            x1={0}
            y1={toY(step)}
            x2={width}
            y2={toY(step)}
            stroke={COURSE_THEME.mapGrid}
            strokeWidth={0.5}
          />
        </g>
      ))}

      {/* Path */}
      <g transform={`translate(${COURSE_MAP_INSET} ${COURSE_MAP_INSET}) scale(${drawableWidth / 100} ${drawableHeight / 100})`}>
        {segments.map((segment, i) => (
          <g key={`${places[i]?.id}-${places[i + 1]?.id}`}>
            <path
              d={segment.path}
              stroke={COURSE_MAP_ROUTE_STYLE.borderColor}
              fill="none"
              vectorEffect="non-scaling-stroke"
              strokeWidth={COURSE_MAP_ROUTE_STYLE.borderWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d={segment.path}
              stroke={getCourseSequenceColor(i).base}
              fill="none"
              vectorEffect="non-scaling-stroke"
              strokeWidth={COURSE_MAP_ROUTE_STYLE.routeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d={segment.path}
              stroke={COURSE_MAP_ROUTE_STYLE.centerLineColor}
              fill="none"
              vectorEffect="non-scaling-stroke"
              strokeWidth={COURSE_MAP_ROUTE_STYLE.centerLineWidth}
              strokeDasharray={COURSE_MAP_ROUTE_STYLE.centerLineDash}
              strokeLinecap="round"
            />
          </g>
        ))}
      </g>

      {/* Nodes */}
      {places.map((place, i) => (
        <g key={place.id}>
          <circle
            cx={toX(place.coords.x)}
            cy={toY(place.coords.y)}
            r={COURSE_MAP_ROUTE_STYLE.nodeRadius}
            fill={getCourseSequenceColor(i).base}
            stroke={COURSE_MAP_ROUTE_STYLE.borderColor}
            strokeWidth={COURSE_MAP_ROUTE_STYLE.nodeBorderWidth}
          />
          {showLabels && (
            <text
              x={toX(place.coords.x)}
              y={toY(place.coords.y)}
              fill="white"
              fontSize={COURSE_MAP_ROUTE_STYLE.nodeLabelSize}
              textAnchor="middle"
              dominantBaseline="central"
            >
              {i + 1}
            </text>
          )}
        </g>
      ))}

      {/* MAP label */}
      <text x={8} y={14} fill="#9E9E9E" fontSize={10}>
        MAP
      </text>
    </svg>
  );
}
