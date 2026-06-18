import { useApp, Course } from '@/contexts/AppContext';
import { getCourseSequenceColor } from '@/constants/courseTheme';
import { getCourseMapPoints, getCourseRestaurants } from '@/lib/courseMapSync';

export default function CourseMapOverlay({ course }: { course: Course }) {
  const { getRestaurantById } = useApp();

  const stops = getCourseRestaurants(course, getRestaurantById).map((entry) => entry.restaurant);

  if (stops.length === 0) return null;

  const pts = getCourseMapPoints(stops);

  const segmentPaths = pts.slice(1).map((curr, index) => {
    const prev = pts[index]!;
    const cx = prev.x + (curr.x - prev.x) / 2;
    return `M ${prev.x} ${prev.y} C ${cx} ${prev.y}, ${cx} ${curr.y}, ${curr.x} ${curr.y}`;
  });

  return (
    <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden">
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        {segmentPaths.map((pathD, i) => (
          <g key={pathD} style={{ filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.24))' }}>
            <path
              d={pathD}
              stroke="#FFFFFF"
              fill="none"
              vectorEffect="non-scaling-stroke"
              strokeWidth="9"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d={pathD}
              stroke={getCourseSequenceColor(i).base}
              fill="none"
              vectorEffect="non-scaling-stroke"
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        ))}
      </svg>
      {pts.map((pt, i) => (
        <div
          key={i}
          className="absolute w-[24px] h-[24px] rounded-full border-2 border-white flex items-center justify-center text-white font-bold text-[12px] shadow-md"
          style={{
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
