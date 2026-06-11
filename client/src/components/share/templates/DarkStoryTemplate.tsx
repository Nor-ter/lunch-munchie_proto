import { forwardRef } from 'react';
import { Course } from '@/types/course';
import { CourseMap } from '@/components/course/CourseMap';

interface TemplateProps {
  course: Course;
}

const DarkStoryTemplate = forwardRef<HTMLDivElement, TemplateProps>(({ course }, ref) => {
  return (
    <div
      ref={ref}
      style={{
        width: 240,
        height: 380,
        background: 'linear-gradient(160deg, #1A1A1A 0%, #2d2d2d 50%, #1A1A1A 100%)',
        padding: 20,
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: "'Baloo 2', 'Pretendard Variable', 'Pretendard', cursive",
      }}
    >
      <span style={{ fontSize: 9, color: '#EB5053', letterSpacing: 1 }}>LUNCHIE MUNCHIE</span>
      <p style={{ fontSize: 18, fontWeight: 'bold', color: '#fff', margin: '8px 0 4px' }}>
        {course.title}
      </p>
      <p style={{ fontSize: 11, color: '#aaa', margin: '0 0 12px' }}>
        {course.distanceKm}km · {course.durationHours}h · {course.places.length}곳
      </p>
      <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid #333' }}>
        <CourseMap places={course.places} width={200} height={200} />
      </div>
      <p style={{ fontSize: 10, color: '#666', marginTop: 'auto', textAlign: 'center' }}>
        @{course.authorHandle}
      </p>
    </div>
  );
});

DarkStoryTemplate.displayName = 'DarkStoryTemplate';
export default DarkStoryTemplate;
