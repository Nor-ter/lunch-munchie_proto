import { englishText } from '@shared/englishCopy';
import { forwardRef } from 'react';
import { Course } from '@/types/course';
import { CourseMap } from '@/components/course/CourseMap';

interface TemplateProps {
  course: Course;
}

const StatsCardTemplate = forwardRef<HTMLDivElement, TemplateProps>(({ course }, ref) => {
  const stats = [
    { label: "Distance", value: `${course.distanceKm}km` },
    { label: "Duration", value: `${course.durationHours}h` },
    { label: "Places", value: `${course.places.length} restaurants` },
    { label: "Save", value: course.saveCount.toLocaleString() },
  ];

  return (
    <div
      ref={ref}
      style={{
        width: 240,
        height: 380,
        backgroundColor: '#FFF0EE',
        padding: 20,
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: "'Baloo 2', 'Pretendard Variable', 'Pretendard', cursive",
      }}
    >
      <p style={{ fontSize: 16, fontWeight: 'bold', color: '#1A1A1A', margin: 0 }}>
        {englishText(course.title)}
      </p>
      <p style={{ fontSize: 10, color: '#EB5053', margin: '4px 0 12px' }}>
        {englishText(course.hashtags.map((t) => `#${t}`).join(' '))}
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 8,
          marginBottom: 12,
        }}
      >
        {stats.map((s) => (
          <div
            key={s.label}
            style={{
              backgroundColor: '#fff',
              borderRadius: 10,
              padding: '10px 8px',
              textAlign: 'center',
            }}
          >
            <p style={{ fontSize: 14, fontWeight: 'bold', color: '#1A1A1A', margin: 0 }}>{englishText(s.value)}</p>
            <p style={{ fontSize: 9, color: '#9E9E9E', margin: '2px 0 0' }}>{englishText(s.label)}</p>
          </div>
        ))}
      </div>

      <CourseMap places={course.places} width={200} height={160} />
    </div>
  );
});

StatsCardTemplate.displayName = 'StatsCardTemplate';
export default StatsCardTemplate;
