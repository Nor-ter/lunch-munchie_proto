import { forwardRef } from 'react';
import { Course } from '@/types/course';
import { StravaRouteMap } from '@/components/share/StravaRouteMap';
import { TransparentMapFrame } from './TransparentMapFrame';

interface TemplateProps {
  course: Course;
}

const StravaCoralTemplate = forwardRef<HTMLDivElement, TemplateProps>(
  ({ course }, ref) => (
    <TransparentMapFrame ref={ref}>
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: "'Pretendard Variable', 'Pretendard', sans-serif",
          position: 'relative',
        }}
      >
        <p
          style={{
            margin: '0 0 8px',
            fontSize: 15,
            fontWeight: 800,
            color: '#1A1A1A',
            textAlign: 'center',
            maxWidth: 200,
            lineHeight: 1.25,
            textShadow: '0 1px 8px rgba(255,255,255,0.9)',
          }}
        >
          {course.title}
        </p>

        <StravaRouteMap
          places={course.places}
          width={216}
          height={240}
          variant="coral"
        />

        <div
          style={{
            marginTop: 10,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: 'linear-gradient(135deg, rgba(255,107,91,0.95), rgba(255,140,120,0.95))',
            borderRadius: 24,
            padding: '10px 18px',
            boxShadow: '0 4px 16px rgba(255,107,91,0.35)',
          }}
        >
          <span style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>
            {course.distanceKm}
          </span>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.9)' }}>km</span>
          <span style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.4)' }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>
            {course.places.length} stops
          </span>
        </div>
      </div>
    </TransparentMapFrame>
  )
);

StravaCoralTemplate.displayName = 'StravaCoralTemplate';
export default StravaCoralTemplate;
