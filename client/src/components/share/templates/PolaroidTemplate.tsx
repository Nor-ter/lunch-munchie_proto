import { forwardRef } from 'react';
import { Course } from '@/types/course';
import { CourseMap } from '@/components/course/CourseMap';

interface TemplateProps {
  course: Course;
}

const PolaroidTemplate = forwardRef<HTMLDivElement, TemplateProps>(({ course }, ref) => {
  return (
    <div
      ref={ref}
      style={{
        width: 240,
        height: 380,
        backgroundColor: '#F5F0E8',
        padding: 16,
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: "'Pretendard Variable', 'Pretendard', sans-serif",
      }}
    >
      <div
        style={{
          backgroundColor: '#fff',
          padding: 10,
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <CourseMap places={course.places} width={200} height={200} />
        <p
          style={{
            fontSize: 13,
            fontWeight: 'bold',
            color: '#1A1A1A',
            margin: '10px 0 4px',
            textAlign: 'center',
          }}
        >
          {course.title}
        </p>
        <p style={{ fontSize: 10, color: '#9E9E9E', margin: 0, textAlign: 'center' }}>
          @{course.authorHandle} · {course.places.length} stops
        </p>
      </div>
      <div style={{ display: 'flex', gap: 4, marginTop: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
        {course.hashtags.slice(0, 3).map((tag) => (
          <span key={tag} style={{ fontSize: 9, color: '#EB5053' }}>
            #{tag}
          </span>
        ))}
      </div>
    </div>
  );
});

PolaroidTemplate.displayName = 'PolaroidTemplate';
export default PolaroidTemplate;
