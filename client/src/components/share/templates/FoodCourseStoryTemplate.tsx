import { forwardRef } from 'react';
import { Course } from '@/types/course';
import { FoodCourseMap } from '@/components/share/FoodCourseMap';

interface TemplateProps {
  course: Course;
}

const CARD_W = 270;
const CARD_H = 480;

function formatDuration(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

const FoodCourseStoryTemplate = forwardRef<HTMLDivElement, TemplateProps>(({ course }, ref) => {
  const stats = [
    { label: 'Distance', value: `${course.distanceKm} km`, color: '#FF6B35' },
    { label: 'Time', value: formatDuration(course.durationHours), color: '#4CAF50' },
    { label: 'Spots', value: `${course.places.length}`, color: '#FF6B35' },
  ];

  return (
    <div
      ref={ref}
      style={{
        width: CARD_W,
        height: CARD_H,
        background: '#FFFFFF',
        borderRadius: 20,
        overflow: 'hidden',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div style={{ padding: '20px 20px 12px' }}>
        <p
          style={{
            margin: 0,
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: 1.2,
            color: '#9E9E9E',
            textTransform: 'uppercase',
          }}
        >
          Food Course Map
        </p>
        <h1
          style={{
            margin: '4px 0 0',
            fontSize: 22,
            fontWeight: 900,
            color: '#1A1A1A',
            letterSpacing: -0.5,
            lineHeight: 1.1,
          }}
        >
          MY FOOD COURSE
        </h1>
        {course.subtitle && (
          <p style={{ margin: '4px 0 0', fontSize: 11, color: '#666' }}>{course.subtitle}</p>
        )}

        {/* Stats row */}
        <div style={{ display: 'flex', gap: 16, marginTop: 14 }}>
          {stats.map((s) => (
            <div key={s.label}>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#1A1A1A' }}>{s.value}</p>
              <p style={{ margin: '1px 0 0', fontSize: 8, color: '#9E9E9E', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {s.label}
              </p>
            </div>
          ))}
        </div>

        {/* Hashtags */}
        <div
          style={{
            marginTop: 10,
            background: '#F5F5F5',
            borderRadius: 8,
            padding: '6px 10px',
            display: 'flex',
            gap: 6,
            flexWrap: 'wrap',
          }}
        >
          {course.hashtags.slice(0, 3).map((tag) => (
            <span key={tag} style={{ fontSize: 9, color: '#666', fontWeight: 600 }}>
              #{tag}
            </span>
          ))}
        </div>
      </div>

      {/* Map */}
      <div style={{ padding: '0 12px', flex: 1, minHeight: 0 }}>
        <FoodCourseMap
          places={course.places}
          width={CARD_W - 24}
          height={200}
          showMiniCards
          showTravelPills
        />
      </div>

      {/* Itinerary mini list */}
      <div style={{ padding: '10px 20px 0', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {course.places.slice(0, 3).map((place, i) => (
          <div key={place.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                width: 18,
                height: 18,
                borderRadius: 9,
                background: place.color ?? '#EB5053',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <span style={{ fontSize: 8, fontWeight: 800, color: '#FFF' }}>{i + 1}</span>
            </div>
            <span style={{ fontSize: 10, fontWeight: 600, color: '#1A1A1A', flex: 1 }}>{place.name}</span>
            {place.time && <span style={{ fontSize: 9, color: '#9E9E9E' }}>{place.time}</span>}
          </div>
        ))}
        {course.places.length > 3 && (
          <p style={{ margin: 0, fontSize: 9, color: '#9E9E9E', textAlign: 'center' }}>
            +{course.places.length - 3} more stops
          </p>
        )}
      </div>

      {/* Footer */}
      <div
        style={{
          marginTop: 'auto',
          padding: '12px 20px 16px',
          borderTop: '1px solid #F0F0F0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          {course.date && (
            <p style={{ margin: 0, fontSize: 9, color: '#9E9E9E' }}>{course.date}</p>
          )}
          {course.weather && (
            <p style={{ margin: '2px 0 0', fontSize: 9, color: '#9E9E9E' }}>{course.weather} ☀️</p>
          )}
        </div>
        <span style={{ fontSize: 9, fontWeight: 700, color: '#EB5053', letterSpacing: 0.8 }}>
          LUNCHIE
        </span>
      </div>
    </div>
  );
});

FoodCourseStoryTemplate.displayName = 'FoodCourseStoryTemplate';
export default FoodCourseStoryTemplate;
