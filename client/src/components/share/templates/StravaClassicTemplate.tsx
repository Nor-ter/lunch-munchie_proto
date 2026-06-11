import { forwardRef } from 'react';
import { Course } from '@/types/course';
import { StravaRouteMap } from '@/components/share/StravaRouteMap';
import { TransparentMapFrame } from './TransparentMapFrame';

interface TemplateProps {
  course: Course;
}

const StravaClassicTemplate = forwardRef<HTMLDivElement, TemplateProps>(
  ({ course }, ref) => (
    <TransparentMapFrame ref={ref}>
      <div
        style={{
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 12,
          fontFamily: "'Baloo 2', cursive",
        }}
      >
        <div
          style={{
            background: 'rgba(255,255,255,0.92)',
            backdropFilter: 'blur(8px)',
            borderRadius: 20,
            padding: '6px 14px',
            boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
          }}
        >
          <span style={{ fontSize: 11, fontWeight: 700, color: '#FC4C02', letterSpacing: 0.5 }}>
            LUNCHIE
          </span>
        </div>

        <StravaRouteMap
          places={course.places}
          width={208}
          height={220}
          variant="strava"
        />

        <div
          style={{
            display: 'flex',
            gap: 8,
            flexWrap: 'wrap',
            justifyContent: 'center',
          }}
        >
          {[
            { label: '거리', value: `${course.distanceKm} km` },
            { label: '시간', value: `${course.durationHours} h` },
            { label: '스팟', value: `${course.places.length}` },
          ].map((s) => (
            <div
              key={s.label}
              style={{
                background: 'rgba(255,255,255,0.95)',
                borderRadius: 12,
                padding: '8px 12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                textAlign: 'center',
                minWidth: 56,
              }}
            >
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#1A1A1A' }}>{s.value}</p>
              <p style={{ margin: '2px 0 0', fontSize: 9, color: '#9E9E9E', textTransform: 'uppercase' }}>
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </TransparentMapFrame>
  )
);

StravaClassicTemplate.displayName = 'StravaClassicTemplate';
export default StravaClassicTemplate;
