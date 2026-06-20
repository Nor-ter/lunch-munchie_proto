import { useApp, Course } from '@/contexts/AppContext';
import { COURSE_MAP_ROUTE_STYLE, getCourseSequenceColor } from '@/constants/courseTheme';
import {
  getCourseMapPoints,
  getCourseRestaurants,
  getCurvedCourseSegments,
} from '@/lib/courseMapSync';

export default function CourseMapOverlay({ course }: { course: Course }) {
  const { getRestaurantById } = useApp();

  const stops = getCourseRestaurants(course, getRestaurantById).map((entry) => entry.restaurant);

  if (stops.length === 0) return null;

  const pts = getCourseMapPoints(stops);

  const segments = getCurvedCourseSegments(pts);

  return (
    <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden">
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        {segments.map((segment, i) => (
          <g key={`${i}-${segment.path}`} style={{ filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.24))' }}>
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
      </svg>
      {pts.map((pt, i) => (
        <div
          key={i}
          className="absolute rounded-full border-white flex items-center justify-center text-white font-bold shadow-md"
          style={{
            width: COURSE_MAP_ROUTE_STYLE.nodeSize,
            height: COURSE_MAP_ROUTE_STYLE.nodeSize,
            borderWidth: COURSE_MAP_ROUTE_STYLE.nodeBorderWidth,
            fontSize: COURSE_MAP_ROUTE_STYLE.nodeLabelSize,
            left: `${pt.x}%`,
            top: `${pt.y}%`,
            transform: 'translate(-50%, -50%)',
            background: getCourseSequenceColor(i).base,
          }}
        >
          {i + 1}
        </div>
      ))}
    </div>
  );
}
