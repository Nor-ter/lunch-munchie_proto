import { CoursePlace } from '@/types/course';

const DEFAULT_COLORS = ['#FF6B35', '#4CAF50', '#2196F3', '#9C27B0', '#E91E63'];

interface FoodCourseMapProps {
  places: CoursePlace[];
  width?: number;
  height?: number;
  showMiniCards?: boolean;
  showTravelPills?: boolean;
  variant?: 'light' | 'dark';
}

export function FoodCourseMap({
  places,
  width = 280,
  height = 220,
  showMiniCards = true,
  showTravelPills = true,
  variant = 'light',
}: FoodCourseMapProps) {
  const pad = 16;
  const toX = (x: number) => pad + (x / 100) * (width - pad * 2);
  const toY = (y: number) => pad + (y / 100) * (height - pad * 2);

  const getColor = (place: CoursePlace, i: number) =>
    place.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length];

  const isDark = variant === 'dark';
  const bg = isDark ? '#0A0A0A' : '#E8E4DC';
  const parkFill = isDark ? '#1A2E1A' : '#C8DDB5';
  const parkFill2 = isDark ? '#152515' : '#B5D0A0';
  const waterFill = isDark ? '#0D1F2D' : '#A8CCE0';
  const roadStroke = isDark ? '#2A2A2A' : '#FFFFFF';
  const blockFill = isDark ? '#1C1C1C' : '#D5D0C8';

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ display: 'block', borderRadius: 12 }}
    >
      <defs>
        <filter id="mapShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.15" />
        </filter>
        <filter id="routeGlow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <linearGradient id="waterGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={waterFill} stopOpacity={isDark ? 0.6 : 1} />
          <stop offset="100%" stopColor={isDark ? '#0A1520' : '#8BB8D4'} stopOpacity={isDark ? 0.4 : 0.8} />
        </linearGradient>
      </defs>

      {/* Base */}
      <rect width={width} height={height} fill={bg} rx={12} />

      {/* Parks */}
      <ellipse cx={width * 0.15} cy={height * 0.3} rx={width * 0.12} ry={height * 0.18} fill={parkFill} opacity={0.7} />
      <ellipse cx={width * 0.78} cy={height * 0.75} rx={width * 0.14} ry={height * 0.15} fill={parkFill2} opacity={0.6} />

      {/* Water (한강 느낌) */}
      <path
        d={`M ${width * 0.85} 0 Q ${width * 0.95} ${height * 0.4} ${width} ${height * 0.7} L ${width} ${height} L ${width * 0.7} ${height} Q ${width * 0.8} ${height * 0.5} ${width * 0.85} 0 Z`}
        fill="url(#waterGrad)"
        opacity={0.85}
      />

      {/* Building blocks */}
      {[
        { x: 0.08, y: 0.55, w: 0.1, h: 0.12 },
        { x: 0.2, y: 0.72, w: 0.08, h: 0.1 },
        { x: 0.35, y: 0.78, w: 0.12, h: 0.08 },
        { x: 0.6, y: 0.65, w: 0.09, h: 0.11 },
        { x: 0.72, y: 0.15, w: 0.1, h: 0.14 },
        { x: 0.45, y: 0.08, w: 0.11, h: 0.1 },
      ].map((b, i) => (
        <rect
          key={i}
          x={b.x * width}
          y={b.y * height}
          width={b.w * width}
          height={b.h * height}
          fill={blockFill}
          rx={2}
          opacity={0.5}
        />
      ))}

      {/* Roads */}
      <g stroke={roadStroke} strokeWidth={isDark ? 1.5 : 3} strokeLinecap="round" opacity={isDark ? 0.4 : 0.7}>
        <path d={`M 0 ${height * 0.45} L ${width * 0.55} ${height * 0.42} L ${width * 0.7} ${height * 0.55} L ${width * 0.85} ${height * 0.5}`} fill="none" />
        <path d={`M ${width * 0.2} 0 L ${width * 0.25} ${height * 0.6} L ${width * 0.5} ${height * 0.75} L ${width * 0.65} ${height}`} fill="none" />
        <path d={`M ${width * 0.4} 0 L ${width * 0.45} ${height * 0.35} L ${width * 0.6} ${height * 0.3}`} fill="none" />
      </g>

      {/* Route segments — multi-color */}
      {places.length > 1 &&
        places.slice(0, -1).map((place, i) => {
          const next = places[i + 1];
          const color = getColor(next, i + 1);
          const x1 = toX(place.coords.x);
          const y1 = toY(place.coords.y);
          const x2 = toX(next.coords.x);
          const y2 = toY(next.coords.y);
          const mx = (x1 + x2) / 2;
          const my = (y1 + y2) / 2;
          const cx = mx + (y2 - y1) * 0.15;
          const cy = my - (x2 - x1) * 0.15;

          return (
            <g key={`seg-${place.id}`}>
              <path
                d={`M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`}
                stroke="#FFFFFF"
                strokeWidth={9}
                fill="none"
                strokeLinecap="round"
                opacity={isDark ? 0.15 : 0.9}
              />
              <path
                d={`M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`}
                stroke={color}
                strokeWidth={5.5}
                fill="none"
                strokeLinecap="round"
                filter="url(#routeGlow)"
              />
              {showTravelPills && (
                <g transform={`translate(${cx}, ${cy})`}>
                  <rect x={-22} y={-9} width={44} height={18} rx={9} fill={isDark ? '#1A1A1A' : '#FFFFFF'} opacity={0.92} />
                  <text
                    x={0}
                    y={4}
                    textAnchor="middle"
                    fontSize={7}
                    fontWeight={600}
                    fill={isDark ? '#AAA' : '#666'}
                    fontFamily="'Baloo 2', cursive"
                  >
                    도보 {4 + i * 3}분
                  </text>
                </g>
              )}
            </g>
          );
        })}

      {/* Markers + mini cards */}
      {places.map((place, i) => {
        const cx = toX(place.coords.x);
        const cy = toY(place.coords.y);
        const color = getColor(place, i);
        const cardW = 72;
        const cardH = 28;
        const cardX = cx + 10;
        const cardY = cy - cardH / 2 - 4;
        const flipCard = cardX + cardW > width - 8;

        return (
          <g key={place.id} filter="url(#mapShadow)">
            {/* Marker circle */}
            <circle cx={cx} cy={cy} r={11} fill={color} />
            <circle cx={cx} cy={cy} r={8} fill="#FFFFFF" />
            <text
              x={cx}
              y={cy + 3.5}
              textAnchor="middle"
              fontSize={9}
              fontWeight={800}
              fill={color}
              fontFamily="'Baloo 2', cursive"
            >
              {i + 1}
            </text>

            {showMiniCards && (
              <g transform={`translate(${flipCard ? cx - cardW - 14 : cardX}, ${cardY})`}>
                <rect width={cardW} height={cardH} rx={6} fill="#FFFFFF" />
                {/* Colored icon square instead of external image (html2canvas SVG image 미지원) */}
                <rect x={3} y={3} width={22} height={22} rx={4} fill={color} opacity={0.2} />
                <text x={14} y={17} textAnchor="middle" fontSize={9} fill={color} fontFamily="'Baloo 2', cursive">
                  {i === 0 ? '🍽' : i === 1 ? '☕' : i === 2 ? '🍷' : i === 3 ? '🎂' : '🍸'}
                </text>
                <rect x={28} y={5} width={28} height={10} rx={3} fill={color} opacity={0.15} />
                <text x={30} y={12.5} fontSize={6} fontWeight={700} fill={color} fontFamily="'Baloo 2', cursive">
                  {place.label ?? place.category}
                </text>
                <text
                  x={28}
                  y={22}
                  fontSize={7}
                  fontWeight={700}
                  fill="#1A1A1A"
                  fontFamily="'Baloo 2', cursive"
                >
                  {place.name.length > 8 ? `${place.name.slice(0, 7)}…` : place.name}
                </text>
                {place.time && (
                  <text
                    x={cardW - 4}
                    y={12}
                    textAnchor="end"
                    fontSize={6}
                    fill="#9E9E9E"
                    fontFamily="'Baloo 2', cursive"
                  >
                    {place.time}
                  </text>
                )}
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}
