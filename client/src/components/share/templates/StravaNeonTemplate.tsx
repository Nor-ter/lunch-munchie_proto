import { forwardRef } from 'react';
import { Course } from '@/types/course';
import { StravaRouteMap } from '@/components/share/StravaRouteMap';
import { TransparentMapFrame } from './TransparentMapFrame';

interface TemplateProps {
  course: Course;
}

const StravaNeonTemplate = forwardRef<HTMLDivElement, TemplateProps>(
  ({ course }, ref) => (
    <TransparentMapFrame ref={ref}>
      <div
        style={{
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div
          style={{
            alignSelf: 'flex-start',
            marginBottom: 8,
            padding: '5px 10px',
            borderRadius: 8,
            border: '1.5px solid rgba(56,189,248,0.5)',
            background: 'rgba(255,255,255,0.85)',
          }}
        >
          <span style={{ fontSize: 9, fontWeight: 700, color: '#0EA5E9' }}>
            COURSE MAP
          </span>
        </div>

        <StravaRouteMap
          places={course.places}
          width={210}
          height={230}
          variant="neon"
        />

        <div
          style={{
            marginTop: 14,
            width: '100%',
            display: 'flex',
            justifyContent: 'space-between',
            padding: '0 4px',
          }}
        >
          <div
            style={{
              background: 'rgba(255,255,255,0.9)',
              borderRadius: 10,
              padding: '8px 10px',
              borderLeft: '3px solid #38BDF8',
            }}
          >
            <p style={{ margin: 0, fontSize: 8, color: '#9E9E9E' }}>START</p>
            <p style={{ margin: '2px 0 0', fontSize: 10, fontWeight: 600, color: '#1A1A1A', maxWidth: 72 }}>
              {course.places[0]?.name ?? '—'}
            </p>
          </div>
          <div
            style={{
              background: 'rgba(255,255,255,0.9)',
              borderRadius: 10,
              padding: '8px 10px',
              borderRight: '3px solid #EB5053',
              textAlign: 'right',
            }}
          >
            <p style={{ margin: 0, fontSize: 8, color: '#9E9E9E' }}>FINISH</p>
            <p style={{ margin: '2px 0 0', fontSize: 10, fontWeight: 600, color: '#1A1A1A', maxWidth: 72 }}>
              {course.places[course.places.length - 1]?.name ?? '—'}
            </p>
          </div>
        </div>
      </div>
    </TransparentMapFrame>
  )
);

StravaNeonTemplate.displayName = 'StravaNeonTemplate';
export default StravaNeonTemplate;
