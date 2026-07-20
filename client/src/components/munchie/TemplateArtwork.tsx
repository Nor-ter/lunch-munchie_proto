import { useApp, type Course } from '@/contexts/AppContext';
import type { CoursemapTemplate } from '@/constants/coursemapTemplates';
import { getCoursePlacesFromStops } from '@/lib/courseMapSync';
import { getCoursemapDecor } from '@/lib/coursemapDecor';
import type { PlacedPhoto } from '@/lib/coursemapDecor';
import {
  FruitCharacterWithBubble,
  fruitForStop,
  useSequentialIndex,
} from '@/components/munchie/FruitCharacter';

/**
 * 카드와 상세 페이지에서 동일한 템플릿 결과물을 렌더링한다.
 * 4:3 규격(세로 3:4 캔버스) — 최대 3개 장소, 각 장소 상단에 과일 캐릭터가 앉아
 * 말풍선으로 음식점 이름을 순차적으로 보여준다.
 */
export default function TemplateArtwork({
  course,
  template,
  className = '',
  eager = false,
  photoSources,
  decorOverride,
}: {
  course: Course;
  template: CoursemapTemplate;
  className?: string;
  eager?: boolean;
  photoSources?: string[];
  /** 작성 미리보기에서도 게시 후와 동일한 배치를 렌더링한다. */
  decorOverride?: PlacedPhoto[];
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
  const slots = template.slots.slice(0, Math.min(Math.max(places.length, photos.length, 1), 3));
  const activeStop = useSequentialIndex(decor ? Math.min(decor.length, 3) : slots.length);

  // 슬롯 중심을 잇는 점선 루트 (viewBox 300×400 = 3:4)
  const routePoints = slots
    .map(slot => `${(slot.left + slot.width / 2) * 3},${(slot.top + slot.height / 2) * 4}`)
    .join(' ');

  return (
    <div
      className={`relative w-full overflow-hidden bg-[#F1E7DE] ${className}`}
      style={{ aspectRatio: '3 / 4' }}
    >
      <img
        src={template.image}
        alt={`${template.name} 코스피드 배경`}
        className="absolute inset-0 h-full w-full object-cover"
        draggable={false}
        loading={eager ? 'eager' : 'lazy'}
      />

      {decor ? (
        /* ── 유저가 직접 꾸민 배치 재현 ── */
        <>
          {decor.slice(0, 3).map((photo, index) => (
            <div
              key={photo.id}
              className="absolute"
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
                  className="h-full w-full object-cover"
                  draggable={false}
                  loading={eager ? 'eager' : 'lazy'}
                />
              </div>
              {index < 3 && places[index] && (
                <span className="absolute -top-4 left-1/2 z-10 -translate-x-1/2">
                  <FruitCharacterWithBubble
                    kind={fruitForStop(index)}
                    label={places[index]?.name ?? ''}
                    active={activeStop === index}
                    size={30}
                  />
                </span>
              )}
            </div>
          ))}
        </>
      ) : (
        <>
      {slots.length > 1 && (
        <svg
          viewBox="0 0 300 400"
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full"
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
        const place = places[index];
        return (
          <div
            key={index}
            className="absolute"
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
            {/* 각 음식점 상단의 과일 캐릭터 + 말풍선 */}
            {place && (
              <span className="absolute -top-4 left-1/2 z-10 -translate-x-1/2">
                <FruitCharacterWithBubble
                  kind={fruitForStop(index)}
                  label={place.name}
                  active={activeStop === index}
                  size={34}
                />
              </span>
            )}
          </div>
        );
      })}
        </>
      )}

    </div>
  );
}
