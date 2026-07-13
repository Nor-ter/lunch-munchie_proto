import { useApp, type Course } from '@/contexts/AppContext';
import type { CoursemapTemplate } from '@/constants/coursemapTemplates';

/** 카드와 상세 페이지에서 동일한 템플릿 결과물을 렌더링한다. */
export default function TemplateArtwork({
  course,
  template,
  className = '',
  eager = false,
}: {
  course: Course;
  template: CoursemapTemplate;
  className?: string;
  eager?: boolean;
}) {
  const { getRestaurantById } = useApp();
  const photos = [
    ...course.stops
      .map((stop) => getRestaurantById(stop.placeId)?.image)
      .filter((photo): photo is string => !!photo),
    course.heroImage,
  ].filter((photo): photo is string => !!photo);
  const dateLabel = course.createdAt.slice(0, 10).replace(/-/g, '/');

  return (
    <div
      className={`relative w-full overflow-hidden bg-[#F1E7DE] ${className}`}
      style={{ aspectRatio: '9 / 16' }}
    >
      <img
        src={template.image}
        alt={`${template.name} 템플릿으로 만든 ${course.title}`}
        className="absolute inset-0 h-full w-full object-cover"
        draggable={false}
        loading={eager ? 'eager' : 'lazy'}
      />
      {template.slots.map((slot, index) => (
        <div
          key={index}
          className="absolute overflow-hidden"
          style={{
            left: `${slot.left}%`,
            top: `${slot.top}%`,
            width: `${slot.width}%`,
            height: `${slot.height}%`,
            borderRadius: slot.radius ?? 0,
            transform: slot.rotate ? `rotate(${slot.rotate}deg)` : undefined,
          }}
        >
          <img
            src={photos[index % photos.length] ?? template.image}
            alt=""
            className="h-full w-full object-cover"
            draggable={false}
            loading={eager ? 'eager' : 'lazy'}
          />
        </div>
      ))}
      {template.label && (
        <div
          className="absolute flex flex-col items-center justify-center px-1 text-center"
          style={{
            left: `${template.label.left}%`,
            top: `${template.label.top}%`,
            width: `${template.label.width}%`,
            height: `${template.label.height}%`,
            background: template.label.bg,
            borderRadius: 6,
            color: template.label.color,
            transform: template.label.rotate ? `rotate(${template.label.rotate}deg)` : undefined,
            boxShadow: template.label.bg ? '0 1px 3px rgba(0,0,0,0.08)' : undefined,
          }}
        >
          <p className="w-full truncate text-[clamp(7px,2.4vw,12px)] font-bold leading-tight">
            {course.title}
          </p>
          <p className="text-[clamp(6px,1.8vw,10px)] font-semibold leading-tight opacity-70">
            {dateLabel}
          </p>
        </div>
      )}
    </div>
  );
}
