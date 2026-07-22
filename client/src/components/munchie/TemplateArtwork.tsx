import { useApp, type Course } from '@/contexts/AppContext';
import type { CoursemapTemplate } from '@/constants/coursemapTemplates';
import { getCoursePlacesFromStops } from '@/lib/courseMapSync';
import { getCoursemapCanvasStrokes, getCoursemapDecor } from '@/lib/coursemapDecor';
import type { CoursemapCanvasStroke, PlacedPhoto } from '@/lib/coursemapDecor';
import { TemplateBackgroundLayer, TemplateFrameLayer } from '@/components/munchie/TemplateLayers';

/**
 * 카드와 상세 페이지에서 동일한 템플릿 결과물을 렌더링한다.
 * 4:3 규격(세로 3:4 캔버스) 안에 작성자가 배치한 사진을 보여준다.
 * 먼치피드의 모든 유형에서 과일 캐릭터 오버레이는 사용하지 않는다.
 */
export default function TemplateArtwork({
  course,
  template,
  className = '',
  eager = false,
  photoSources,
  decorOverride,
  strokesOverride,
}: {
  course: Course;
  template: CoursemapTemplate;
  className?: string;
  eager?: boolean;
  photoSources?: string[];
  /** 작성 미리보기에서도 게시 후와 동일한 배치를 렌더링한다. */
  decorOverride?: PlacedPhoto[];
  strokesOverride?: CoursemapCanvasStroke[];
}) {
  const { getRestaurantById } = useApp();
  const syncedPlaces = getCoursePlacesFromStops(course, getRestaurantById);
  const places = syncedPlaces.slice(0, 3);
  const photos = (photoSources?.length ? photoSources : [
    ...places.map(place => place.imageUrl),
    course.heroImage,
  ]).filter((photo): photo is string => !!photo).slice(0, 3);
  // 만들기 플로우에서 직접 꾸민 배치가 있으면 그 배치를 그대로 재현한다
  const decor = decorOverride ?? getCoursemapDecor(course.id);
  const canvasStrokes = strokesOverride ?? getCoursemapCanvasStrokes(course.id);
  const slots = template.slots.slice(0, Math.min(Math.max(places.length, photos.length, 1), 3));

  // 슬롯 중심을 잇는 점선 루트 (viewBox 300×400 = 3:4)
  const routePoints = slots
    .map(slot => `${(slot.left + slot.width / 2) * 3},${(slot.top + slot.height / 2) * 4}`)
    .join(' ');

  return (
    <div
      className={`relative isolate w-full overflow-hidden bg-[#F1E7DE] ${className}`}
      style={{ aspectRatio: '3 / 4' }}
    >
      <TemplateBackgroundLayer template={template} loading={eager ? 'eager' : 'lazy'} />

      {decor ? (
        /* ── 유저가 직접 꾸민 배치 재현 ── */
        <>
          {decor.map(photo => (
            <div
              key={photo.id}
              className="absolute z-10"
              style={{
                left: `${photo.x}%`,
                top: `${photo.y}%`,
                width: `${photo.w}%`,
                height: `${photo.h ?? photo.w}%`,
                transform: `translate(-50%, -50%) rotate(${photo.rotate}deg)`,
              }}
            >
              <div className="overflow-hidden rounded-[8px] border-[3px] border-white bg-white shadow-[0_6px_16px_rgba(63,38,24,0.18)]">
                <img
                  src={photo.src}
                  alt=""
                  className="h-full w-full object-cover transition-transform duration-150"
                  style={{ transform: `scale(${photo.zoom ?? 1})` }}
                  draggable={false}
                  loading={eager ? 'eager' : 'lazy'}
                />
              </div>
            </div>
          ))}
        </>
      ) : (
        <>
      {slots.length > 1 && (
        <svg
          viewBox="0 0 300 400"
          preserveAspectRatio="none"
          className="absolute inset-0 z-10 h-full w-full"
          aria-hidden="true"
        >
          <polyline
            points={routePoints}
            fill="none"
            stroke="#F25055"
            strokeWidth="3"
            strokeDasharray="2 9"
            strokeLinecap="round"
          />
        </svg>
      )}

      {slots.map((slot, index) => {
        return (
          <div
            key={index}
            className="absolute z-10"
            style={{
              left: `${slot.left}%`,
              top: `${slot.top}%`,
              width: `${slot.width}%`,
              height: `${slot.height}%`,
              transform: slot.rotate ? `rotate(${slot.rotate}deg)` : undefined,
            }}
          >
            <div
              className="h-full w-full overflow-hidden border-[3px] border-white bg-white shadow-[0_6px_16px_rgba(63,38,24,0.18)]"
              style={{ borderRadius: slot.radius ?? '10px' }}
            >
              <img
                src={photos[index % Math.max(photos.length, 1)] ?? template.image}
                alt=""
                className="h-full w-full object-cover"
                draggable={false}
                loading={eager ? 'eager' : 'lazy'}
              />
            </div>
          </div>
        );
      })}
        </>
      )}

      <TemplateFrameLayer template={template} loading={eager ? 'eager' : 'lazy'} />

      {canvasStrokes.length > 0 && (
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 z-40 h-full w-full" aria-hidden="true">
          {canvasStrokes.map(stroke => (
            <polyline
              key={stroke.id}
              points={stroke.points.map(point => `${point.x},${point.y}`).join(' ')}
              fill="none"
              stroke={stroke.color}
              opacity={stroke.opacity ?? 1}
              strokeWidth={stroke.width}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
        </svg>
      )}

    </div>
  );
}
