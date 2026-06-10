import { forwardRef } from 'react';
import { Course } from '@/types/course';
import { CourseMap } from '@/components/course/CourseMap';

interface TemplateProps {
  course: Course;
}

const MinimalTemplate = forwardRef<HTMLDivElement, TemplateProps>(({ course }, ref) => {
  return (
    <div
      ref={ref}
      style={{
        width: 240,
        height: 380,
        backgroundColor: '#ffffff',
        boxSizing: 'border-box',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'sans-serif',
        gap: 8,
      }}
    >
      {/* Top-right label */}
      <span
        style={{
          position: 'absolute',
          top: 12,
          right: 12,
          fontSize: 9,
          color: '#9E9E9E',
        }}
      >
        ▶ My Course Map
      </span>

      <p style={{ fontSize: 20, fontWeight: 'bold', color: '#1A1A1A', margin: 0, textAlign: 'center' }}>
        {course.title}
      </p>
      <p style={{ fontSize: 12, color: '#EB5053', margin: 0 }}>
        맛있는 하루 코스 ♥
      </p>
      <CourseMap places={course.places} width={200} height={150} />
    </div>
  );
});

MinimalTemplate.displayName = 'MinimalTemplate';
export default MinimalTemplate;
