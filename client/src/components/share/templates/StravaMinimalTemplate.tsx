import { forwardRef } from 'react';
import { Course } from '@/types/course';
import { StravaRouteMap } from '@/components/share/StravaRouteMap';

interface TemplateProps {
  course: Course;
}

const CARD_W = 270;
const CARD_H = 480;

/** Strava "route only" — black bg, orange line, wordmark. No stats. */
const StravaMinimalTemplate = forwardRef<HTMLDivElement, TemplateProps>(({ course }, ref) => (
  <div
    ref={ref}
    style={{
      width: CARD_W,
      height: CARD_H,
      background: '#000000',
      borderRadius: 20,
      overflow: 'hidden',
      fontFamily: "'Pretendard Variable', 'Pretendard', sans-serif",
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '48px 32px',
      gap: 32,
    }}
  >
    <StravaRouteMap
      places={course.places}
      width={CARD_W - 64}
      height={320}
      variant="strava"
      showWaypoints={false}
    />

    <p
      style={{
        margin: 0,
        fontSize: 20,
        fontWeight: 900,
        color: '#FFFFFF',
        letterSpacing: 4,
      }}
    >
      LUNCHIE
    </p>
  </div>
));

StravaMinimalTemplate.displayName = 'StravaMinimalTemplate';
export default StravaMinimalTemplate;
