import { CoursePlace } from '@/types/course';

interface CourseMapProps {
  places: CoursePlace[];
  width?: number;
  height?: number;
  showLabels?: boolean;
  className?: string;
}

const GRID_STEPS = [10, 20, 30, 40, 50, 60, 70, 80, 90];

export function CourseMap({
  places,
  width = 300,
  height = 200,
  showLabels = true,
  className = '',
}: CourseMapProps) {
  const toX = (x: number) => (x / 100) * width;
  const toY = (y: number) => (y / 100) * height;

  const polylinePoints = places
    .map((p) => `${toX(p.coords.x)},${toY(p.coords.y)}`)
    .join(' ');

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={`rounded-xl overflow-hidden ${className}`}
    >
      {/* Background */}
      <rect width={width} height={height} fill="#F8F5F0" />

      {/* Grid lines */}
      {GRID_STEPS.map((step) => (
        <g key={step}>
          <line
            x1={toX(step)}
            y1={0}
            x2={toX(step)}
            y2={height}
            stroke="#E8E3DC"
            strokeWidth={0.5}
          />
          <line
            x1={0}
            y1={toY(step)}
            x2={width}
            y2={toY(step)}
            stroke="#E8E3DC"
            strokeWidth={0.5}
          />
        </g>
      ))}

      {/* Path */}
      {places.length > 1 && (
        <polyline
          points={polylinePoints}
          stroke="#FF6B5B"
          strokeWidth={2}
          strokeDasharray="6,4"
          fill="none"
        />
      )}

      {/* Nodes */}
      {places.map((place, i) => (
        <g key={place.id}>
          <circle
            cx={toX(place.coords.x)}
            cy={toY(place.coords.y)}
            r={8}
            fill="#1A1A1A"
          />
          {showLabels && (
            <text
              x={toX(place.coords.x)}
              y={toY(place.coords.y)}
              fill="white"
              fontSize={10}
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
