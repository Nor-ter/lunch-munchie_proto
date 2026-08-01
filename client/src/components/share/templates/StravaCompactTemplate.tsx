import { forwardRef } from 'react';
import { Course } from '@/types/course';
import { StravaRouteMap } from '@/components/share/StravaRouteMap';
import { TransparentMapFrame } from './TransparentMapFrame';

interface TemplateProps {
  course: Course;
}

/** Map-only, minimal chrome — closest to pure Strava overlay */
const StravaCompactTemplate = forwardRef<HTMLDivElement, TemplateProps>(
  ({ course }, ref) => (
    <TransparentMapFrame ref={ref}>
      <StravaRouteMap
        places={course.places}
        width={228}
        height={300}
        variant="strava"
        showWaypoints={false}
      />
    </TransparentMapFrame>
  )
);

StravaCompactTemplate.displayName = 'StravaCompactTemplate';
export default StravaCompactTemplate;
