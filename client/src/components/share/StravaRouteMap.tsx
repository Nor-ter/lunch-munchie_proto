import { CoursePlace } from '@/types/course';

export type StravaRouteVariant = 'strava' | 'coral' | 'mono' | 'neon';

interface StravaRouteMapProps {
  places: CoursePlace[];
  width?: number;
  height?: number;
  variant?: StravaRouteVariant;
  showWaypoints?: boolean;
}

const VARIANT_STYLES: Record<
  StravaRouteVariant,
  { stroke: string; width: number; glow?: string; dash?: string }
> = {
  strava: { stroke: '#FC4C02', width: 5.5 },
  coral: { stroke: '#FF6B5B', width: 5, glow: '#FFB4A8' },
  mono: { stroke: '#1A1A1A', width: 3.5 },
  neon: { stroke: 'url(#routeNeonGrad)', width: 5, glow: '#7DD3FC' },
};

export function StravaRouteMap({
  places,
  width = 200,
  height = 200,
  variant = 'strava',
  showWaypoints = true,
}: StravaRouteMapProps) {
  const pad = 22;
  const toX = (x: number) => pad + (x / 100) * (width - pad * 2);
  const toY = (y: number) => pad + (y / 100) * (height - pad * 2);

  const polylinePoints = places
    .map((p) => `${toX(p.coords.x)},${toY(p.coords.y)}`)
    .join(' ');

  const style = VARIANT_STYLES[variant];
  const last = places.length - 1;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ overflow: 'visible' }}
    >
      <defs>
        <linearGradient id="routeNeonGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="50%" stopColor="#A78BFA" />
          <stop offset="100%" stopColor="#FF6B5B" />
        </linearGradient>
        <filter id="routeGlow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="softShadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="1" stdDeviation="2" floodOpacity="0.25" />
        </filter>
      </defs>

      {/* Glow underlay */}
      {(variant === 'coral' || variant === 'neon') && places.length > 1 && (
        <polyline
          points={polylinePoints}
          stroke={style.glow ?? style.stroke}
          strokeWidth={style.width + 6}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          opacity={0.35}
          filter="url(#routeGlow)"
        />
      )}

      {/* White outline (Strava-style) */}
      {places.length > 1 && (
        <polyline
          points={polylinePoints}
          stroke="#FFFFFF"
          strokeWidth={style.width + 3}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          opacity={variant === 'mono' ? 0.9 : 1}
        />
      )}

      {/* Main route */}
      {places.length > 1 && (
        <polyline
          points={polylinePoints}
          stroke={style.stroke}
          strokeWidth={style.width}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={style.dash}
          fill="none"
          filter={variant === 'neon' ? 'url(#routeGlow)' : undefined}
        />
      )}

      {/* Middle waypoints */}
      {showWaypoints &&
        places.slice(1, -1).map((place, i) => (
          <circle
            key={place.id}
            cx={toX(place.coords.x)}
            cy={toY(place.coords.y)}
            r={4}
            fill="#FFFFFF"
            stroke={variant === 'mono' ? '#1A1A1A' : style.stroke === 'url(#routeNeonGrad)' ? '#FF6B5B' : style.stroke}
            strokeWidth={2}
          />
        ))}

      {/* Start */}
      {places[0] && (
        <g filter="url(#softShadow)">
          <circle cx={toX(places[0].coords.x)} cy={toY(places[0].coords.y)} r={9} fill="#22C55E" />
          <circle cx={toX(places[0].coords.x)} cy={toY(places[0].coords.y)} r={4} fill="#FFFFFF" />
        </g>
      )}

      {/* End */}
      {last > 0 && places[last] && (
        <g filter="url(#softShadow)">
          <circle cx={toX(places[last].coords.x)} cy={toY(places[last].coords.y)} r={9} fill="#EF4444" />
          <rect
            x={toX(places[last].coords.x) - 3}
            y={toY(places[last].coords.y) - 3}
            width={6}
            height={6}
            fill="#FFFFFF"
            transform={`rotate(45 ${toX(places[last].coords.x)} ${toY(places[last].coords.y)})`}
          />
        </g>
      )}
    </svg>
  );
}
