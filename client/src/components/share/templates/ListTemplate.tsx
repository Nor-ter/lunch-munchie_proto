import { forwardRef } from 'react';
import { Course } from '@/types/course';

interface TemplateProps {
  course: Course;
}

const TIMES = ['12:00', '14:00', '18:00', '20:00'];

const ListTemplate = forwardRef<HTMLDivElement, TemplateProps>(({ course }, ref) => {
  return (
    <div
      ref={ref}
      style={{
        width: 240,
        height: 380,
        backgroundColor: '#ffffff',
        padding: 20,
        boxSizing: 'border-box',
        fontFamily: "'Baloo 2', cursive",
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <p style={{ fontSize: 16, fontWeight: 'bold', color: '#1A1A1A', margin: 0 }}>
        {course.title}
      </p>
      <p style={{ fontSize: 11, color: '#EB5053', margin: '6px 0 12px 0' }}>
        맛있는 하루 코스 ♥
      </p>

      {/* Place list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {course.places.map((place, i) => (
          <div key={place.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Number badge */}
            <div
              style={{
                width: 20,
                height: 20,
                borderRadius: '50%',
                backgroundColor: '#1A1A1A',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <span style={{ fontSize: 9, color: '#ffffff' }}>{i + 1}</span>
            </div>

            {/* Name */}
            <span style={{ fontSize: 12, color: '#1A1A1A', flexGrow: 1 }}>
              {place.name}
            </span>

            {/* Time */}
            <span style={{ fontSize: 10, color: '#9E9E9E', flexShrink: 0 }}>
              {TIMES[i] ?? ''}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
});

ListTemplate.displayName = 'ListTemplate';
export default ListTemplate;
