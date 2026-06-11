import { forwardRef } from 'react';
import { Course } from '@/types/course';
import { FoodCourseMap } from '@/components/share/FoodCourseMap';

interface TemplateProps {
  course: Course;
}

const CARD_W = 270;
const CARD_H = 480;

/** Full-bleed dark map story — Instagram story style */
const FoodCourseDarkTemplate = forwardRef<HTMLDivElement, TemplateProps>(({ course }, ref) => (
  <div
    ref={ref}
    style={{
      width: CARD_W,
      height: CARD_H,
      background: '#0A0A0A',
      borderRadius: 20,
      overflow: 'hidden',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      boxSizing: 'border-box',
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
    }}
  >
    {/* Map fills most of card */}
    <div style={{ flex: 1, position: 'relative' }}>
      <FoodCourseMap
        places={course.places}
        width={CARD_W}
        height={340}
        showMiniCards
        showTravelPills={false}
        variant="dark"
      />

      {/* Gradient overlay at bottom */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 180,
          background: 'linear-gradient(transparent, rgba(0,0,0,0.85))',
          pointerEvents: 'none',
        }}
      />
    </div>

    {/* Overlay text */}
    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '20px 20px 28px' }}>
      <p style={{ margin: 0, fontSize: 9, fontWeight: 700, color: '#EB5053', letterSpacing: 1 }}>
        @{course.authorHandle}
      </p>
      <h2
        style={{
          margin: '6px 0 0',
          fontSize: 20,
          fontWeight: 900,
          color: '#FFFFFF',
          lineHeight: 1.2,
        }}
      >
        {course.title}
      </h2>
      {course.note && (
        <p style={{ margin: '6px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.7)', fontStyle: 'italic' }}>
          {course.note}
        </p>
      )}
      <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)' }}>
          {course.distanceKm}km
        </span>
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)' }}>·</span>
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)' }}>
          {course.places.length}곳
        </span>
        {course.region && (
          <>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)' }}>·</span>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)' }}>{course.region}</span>
          </>
        )}
      </div>
      <p style={{ margin: '14px 0 0', fontSize: 8, fontWeight: 700, color: '#EB5053', letterSpacing: 1.2, textAlign: 'center' }}>
        LUNCHIE MUNCHIE
      </p>
    </div>
  </div>
));

FoodCourseDarkTemplate.displayName = 'FoodCourseDarkTemplate';
export default FoodCourseDarkTemplate;
