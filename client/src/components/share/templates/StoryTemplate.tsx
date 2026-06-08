import { forwardRef } from 'react';
import { Course } from '@/types/course';
import { CourseMap } from '@/components/course/CourseMap';

interface TemplateProps {
  course: Course;
}

const StoryTemplate = forwardRef<HTMLDivElement, TemplateProps>(({ course }, ref) => {
  return (
    <div
      ref={ref}
      style={{
        width: 240,
        height: 380,
        backgroundColor: '#ffffff',
        padding: 20,
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'sans-serif',
      }}
    >
      {/* Author row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 10, color: '#9E9E9E' }}>@{course.authorHandle}</span>
        <span style={{ fontSize: 10, color: '#9E9E9E' }}>▶ My Course Map</span>
      </div>

      {/* Title */}
      <p style={{ fontSize: 18, fontWeight: 'bold', color: '#1A1A1A', margin: '8px 0 0 0' }}>
        {course.title}
      </p>

      {/* Sub comment */}
      <p style={{ fontSize: 12, color: '#FF6B5B', fontStyle: 'italic', margin: '4px 0 0 0' }}>
        맛있는 하루 코스 ♥
      </p>

      {/* Map */}
      <div style={{ marginTop: 12 }}>
        <CourseMap places={course.places} width={200} height={140} />
      </div>

      {/* Bottom comment */}
      <p style={{ fontSize: 11, color: '#1A1A1A', margin: '12px 0 0 0', flexGrow: 1 }}>
        맛있는 하루, 너무 완벽해! ♥
      </p>

      {/* Footer */}
      <div>
        <div style={{ height: 1, backgroundColor: '#FF6B5B', opacity: 0.3, marginBottom: 6 }} />
        <span style={{ fontSize: 10, color: '#FF6B5B' }}>Lunchie Munchie</span>
      </div>
    </div>
  );
});

StoryTemplate.displayName = 'StoryTemplate';
export default StoryTemplate;
