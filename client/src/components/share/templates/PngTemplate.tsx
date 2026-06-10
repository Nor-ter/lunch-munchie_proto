import { forwardRef } from 'react';
import { Course } from '@/types/course';
import { CourseMap } from '@/components/course/CourseMap';

interface TemplateProps {
  course: Course;
}

const PngTemplate = forwardRef<HTMLDivElement, TemplateProps>(({ course }, ref) => {
  return (
    <div
      ref={ref}
      style={{
        width: 240,
        height: 380,
        boxSizing: 'border-box',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'sans-serif',
        backgroundImage:
          'repeating-conic-gradient(#dddddd 0% 25%, #ffffff 0% 50%)',
        backgroundSize: '16px 16px',
      }}
    >
      {/* Center card */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: 12,
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
        }}
      >
        <p style={{ fontSize: 16, fontWeight: 'bold', color: '#1A1A1A', margin: 0 }}>
          {course.title}
        </p>
        <p style={{ fontSize: 11, color: '#EB5053', margin: '6px 0 0 0' }}>
          맛있는 하루 코스 ♥
        </p>
        <div style={{ marginTop: 8 }}>
          <CourseMap places={course.places} width={180} height={120} />
        </div>
      </div>
    </div>
  );
});

PngTemplate.displayName = 'PngTemplate';
export default PngTemplate;
