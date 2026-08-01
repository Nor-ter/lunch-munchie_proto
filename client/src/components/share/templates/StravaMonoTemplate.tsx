import { forwardRef } from 'react';
import { Course } from '@/types/course';
import { StravaRouteMap } from '@/components/share/StravaRouteMap';
import { TransparentMapFrame } from './TransparentMapFrame';

interface TemplateProps {
  course: Course;
}

const StravaMonoTemplate = forwardRef<HTMLDivElement, TemplateProps>(
  ({ course }, ref) => (
    <TransparentMapFrame ref={ref}>
      <div
        style={{
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          fontFamily: "'Baloo 2', 'Pretendard Variable', 'Pretendard', cursive",
        }}
      >
        <StravaRouteMap
          places={course.places}
          width={220}
          height={260}
          variant="mono"
          showWaypoints={false}
        />

        <div style={{ marginTop: 16, textAlign: 'center' }}>
          <p
            style={{
              margin: 0,
              fontSize: 14,
              fontWeight: 400,
              color: '#1A1A1A',
              letterSpacing: 0.02,
            }}
          >
            {course.title}
          </p>
          <p
            style={{
              margin: '6px 0 0',
              fontSize: 10,
              color: '#6B6B6B',
              fontFamily: "'Baloo 2', 'Pretendard Variable', 'Pretendard', cursive",
            }}
          >
            {course.distanceKm} km · {course.durationHours}h · @{course.authorHandle}
          </p>
        </div>
      </div>
    </TransparentMapFrame>
  )
);

StravaMonoTemplate.displayName = 'StravaMonoTemplate';
export default StravaMonoTemplate;
