import { useApp, Course } from '@/contexts/AppContext';

export default function CourseMapOverlay({ course }: { course: Course }) {
  const { getRestaurantById } = useApp();

  const stops = course.stops
    .map(s => getRestaurantById(s.placeId))
    .filter(Boolean) as NonNullable<ReturnType<typeof getRestaurantById>>[];

  if (stops.length === 0) return null;

  let pts: { x: number; y: number }[] = [];

  if (stops.length === 1) {
    pts = [{ x: 50, y: 50 }];
  } else {
    const lats = stops.map(s => s.lat);
    const lngs = stops.map(s => s.lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    const latRange = maxLat - minLat || 0.01;
    const lngRange = maxLng - minLng || 0.01;

    pts = stops.map(s => {
      const nx = (s.lng - minLng) / lngRange;
      const ny = 1 - (s.lat - minLat) / latRange;
      return { x: 15 + nx * 70, y: 15 + ny * 70 };
    });
  }

  let pathD = '';
  if (pts.length >= 2) {
    pathD = `M ${pts[0]!.x} ${pts[0]!.y}`;
    for (let i = 1; i < pts.length; i++) {
      const prev = pts[i - 1]!;
      const curr = pts[i]!;
      const cx = prev.x + (curr.x - prev.x) / 2;
      pathD += ` C ${cx} ${prev.y}, ${cx} ${curr.y}, ${curr.x} ${curr.y}`;
    }
  }

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        {pathD && (
          <path
            d={pathD}
            stroke="#EB5053"
            fill="none"
            vectorEffect="non-scaling-stroke"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.3))' }}
          />
        )}
      </svg>
      {pts.map((pt, i) => (
        <div
          key={i}
          className="absolute w-[20px] h-[20px] bg-[#EB5053] rounded-full border-2 border-white flex items-center justify-center text-white font-bold text-[11px] shadow-md"
          style={{ left: `${pt.x}%`, top: `${pt.y}%`, transform: 'translate(-50%, -50%)' }}
        >
          {i + 1}
        </div>
      ))}
    </div>
  );
}
