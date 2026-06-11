import { forwardRef } from 'react';
import { Course } from '@/types/course';
import { StravaRouteMap } from '@/components/share/StravaRouteMap';

interface TemplateProps {
  course: Course;
}

const CARD_W = 270;
const CARD_H = 480;

function formatDuration(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (h === 0) return `${m}m`;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

const StravaDarkTemplate = forwardRef<HTMLDivElement, TemplateProps>(({ course }, ref) => {
  const stats = [
    { label: 'Distance', value: `${course.distanceKm} km` },
    { label: 'Time', value: formatDuration(course.durationHours) },
    { label: 'Spots', value: `${course.places.length}` },
  ];

  return (
    <div
      ref={ref}
      style={{
        width: CARD_W,
        height: CARD_H,
        background: '#000000',
        borderRadius: 20,
        overflow: 'hidden',
        fontFamily: "'Baloo 2', 'Pretendard Variable', 'Pretendard', cursive",
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '40px 24px 36px',
      }}
    >
      {/* Route — upper area */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
        <StravaRouteMap
          places={course.places}
          width={CARD_W - 48}
          height={280}
          variant="strava"
          showWaypoints={false}
        />
      </div>

      {/* Brand */}
      <p
        style={{
          margin: '20px 0 0',
          fontSize: 18,
          fontWeight: 900,
          color: '#FFFFFF',
          letterSpacing: 3,
        }}
      >
        LUNCHIE
      </p>

      {/* Stats grid — Strava style */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-around',
          width: '100%',
          marginTop: 24,
          paddingTop: 20,
          borderTop: '1px solid #222',
        }}
      >
        {stats.map((s) => (
          <div key={s.label} style={{ textAlign: 'center', flex: 1 }}>
            <p style={{ margin: 0, fontSize: 8, color: '#888', textTransform: 'uppercase', letterSpacing: 0.8 }}>
              {s.label}
            </p>
            <p style={{ margin: '6px 0 0', fontSize: 20, fontWeight: 800, color: '#FFFFFF', lineHeight: 1.1 }}>
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {/* Title */}
      <p
        style={{
          margin: '16px 0 0',
          fontSize: 11,
          color: '#666',
          textAlign: 'center',
          maxWidth: '90%',
        }}
      >
        {course.title}
        {course.region && ` · ${course.region}`}
      </p>

      {/* Food icon footer */}
      <div style={{ marginTop: 16, opacity: 0.5 }}>
        <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#FFF" strokeWidth={1.5}>
          <path d="M12 2C8 2 5 5 5 9c0 5 7 13 7 13s7-8 7-13c0-4-3-7-7-7z" />
          <circle cx={12} cy={9} r={2} fill="#FFF" />
        </svg>
      </div>
    </div>
  );
});

StravaDarkTemplate.displayName = 'StravaDarkTemplate';
export default StravaDarkTemplate;
