import React, { useEffect, useMemo, useState } from 'react';
import { Clock3, ImageOff, MapPin, Route } from 'lucide-react';

export interface FoodHeroCourseStop {
  id: string;
  name?: string | null;
  category?: string | null;
  address?: string | null;
}

interface FoodHeroCourseOverlayProps {
  /** 작성자가 이 게시물에 직접 업로드한 사진만 전달한다. */
  photos?: Array<string | null | undefined>;
  title?: string | null;
  caption?: string | null;
  stops?: FoodHeroCourseStop[];
  placeCount?: number | null;
  distanceKm?: number | null;
  durationMinutes?: number | null;
  compact?: boolean;
  eager?: boolean;
  className?: string;
}

const cleanText = (value: string | null | undefined) => {
  const cleaned = value?.trim();
  return cleaned || undefined;
};

const positiveNumber = (value: number | null | undefined) => (
  typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : undefined
);

export function getAuthorPhotoSources(photos: FoodHeroCourseOverlayProps['photos'] = []) {
  return Array.from(new Set(
    photos
      .map(cleanText)
      .filter((source): source is string => Boolean(source)),
  ));
}

function formatDuration(minutes: number) {
  if (minutes < 60) return `${Math.round(minutes)}분`;
  const hours = Math.floor(minutes / 60);
  const remainder = Math.round(minutes % 60);
  return remainder ? `${hours}시간 ${remainder}분` : `${hours}시간`;
}

/**
 * Munchie Feed 전용 비주얼.
 *
 * 사진 후보는 게시물 작성자 업로드만 사용한다. 실패하거나 비어 있으면 식당·코스·다른
 * 사용자의 사진으로 대체하지 않고 명시적인 빈 상태를 보여 준다.
 */
export default function FoodHeroCourseOverlay({
  photos = [],
  title,
  caption,
  stops = [],
  placeCount,
  distanceKm,
  durationMinutes,
  compact = false,
  eager = false,
  className = '',
}: FoodHeroCourseOverlayProps) {
  const photoSources = useMemo(() => getAuthorPhotoSources(photos), [photos]);
  const photoKey = photoSources.join('\n');
  const [failedSources, setFailedSources] = useState<string[]>([]);

  useEffect(() => {
    setFailedSources([]);
  }, [photoKey]);

  const activePhoto = photoSources.find(source => !failedSources.includes(source));
  const stopNames = stops.map(stop => cleanText(stop.name)).filter((name): name is string => Boolean(name));
  const resolvedPlaceCount = stops.length || positiveNumber(placeCount);
  const cleanedTitle = cleanText(title);
  const cleanedCaption = cleanText(caption);
  const displayTitle = resolvedPlaceCount === 1
    ? stopNames[0] ?? cleanedTitle ?? '한 곳을 담은 코스'
    : cleanedTitle
      ?? (stopNames[0] && resolvedPlaceCount && resolvedPlaceCount > 1
        ? `${stopNames[0]} 외 ${resolvedPlaceCount - 1}곳`
        : '나만의 Munchie 코스');
  const firstStop = stops[0];
  const category = resolvedPlaceCount === 1 ? cleanText(firstStop?.category) : undefined;
  const address = resolvedPlaceCount === 1 ? cleanText(firstStop?.address) : undefined;
  const resolvedDistance = positiveNumber(distanceKm);
  const resolvedDuration = positiveNumber(durationMinutes);
  const visibleStops = compact ? stopNames.slice(0, 2) : stopNames.slice(0, 3);

  return (
    <section
      data-ui="munchie-food-hero"
      data-state={activePhoto ? 'photo' : 'empty'}
      className={`relative aspect-[4/5] w-full overflow-hidden bg-[#30211B] text-white ${className}`}
      aria-label={`${displayTitle} 코스 요약`}
    >
      {activePhoto ? (
        <img
          src={activePhoto}
          alt={`${displayTitle} 음식 사진`}
          loading={eager ? 'eager' : 'lazy'}
          fetchPriority={eager ? 'high' : 'auto'}
          onError={() => setFailedSources(current => (
            current.includes(activePhoto) ? current : [...current, activePhoto]
          ))}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[radial-gradient(circle_at_50%_35%,#6C5146_0%,#3A2922_52%,#261A16_100%)] px-8 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full border border-white/20 bg-white/10">
            <ImageOff size={28} aria-hidden="true" />
          </span>
          <strong className="mt-4 text-[15px] font-black">작성자가 등록한 음식 사진이 없어요</strong>
          <span className="mt-1 text-[11px] font-semibold text-white/65">코스 정보만 확인할 수 있어요</span>
        </div>
      )}

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/35 via-transparent to-black/90" />

      <div className="absolute inset-x-0 top-0 flex items-center justify-between gap-2 p-3">
        {resolvedPlaceCount ? (
          <span className="flex h-7 items-center gap-1 rounded-full border border-white/15 bg-black/35 px-2.5 text-[10px] font-black backdrop-blur-sm">
            <Route size={12} aria-hidden="true" />
            {resolvedPlaceCount}곳 코스
          </span>
        ) : <span />}
        {photoSources.length > 1 && (
          <span className="rounded-full border border-white/15 bg-black/35 px-2.5 py-1.5 text-[10px] font-black backdrop-blur-sm">
            사진 {photoSources.length}장
          </span>
        )}
      </div>

      <div className={`absolute inset-x-0 bottom-0 ${compact ? 'p-3' : 'p-4'}`}>
        <h3 className={`${compact ? 'text-[15px]' : 'text-[22px]'} line-clamp-2 font-black leading-tight [text-shadow:0_2px_8px_rgba(0,0,0,0.45)]`}>
          {displayTitle}
        </h3>

        {(category || address || resolvedDistance || resolvedDuration) && (
          <div className={`mt-2 flex flex-wrap items-center ${compact ? 'gap-1' : 'gap-1.5'} text-[10px] font-bold text-white/85`}>
            {category && <span className="rounded-full bg-white/15 px-2 py-1 backdrop-blur-sm">{category}</span>}
            {address && !compact && (
              <span className="flex max-w-full items-center gap-1 rounded-full bg-white/15 px-2 py-1 backdrop-blur-sm">
                <MapPin size={10} className="shrink-0" aria-hidden="true" />
                <span className="truncate">{address}</span>
              </span>
            )}
            {resolvedDistance && (
              <span className="flex items-center gap-1 rounded-full bg-white/15 px-2 py-1 backdrop-blur-sm">
                <MapPin size={10} aria-hidden="true" />{resolvedDistance}km
              </span>
            )}
            {resolvedDuration && (
              <span className="flex items-center gap-1 rounded-full bg-white/15 px-2 py-1 backdrop-blur-sm">
                <Clock3 size={10} aria-hidden="true" />{formatDuration(resolvedDuration)}
              </span>
            )}
          </div>
        )}

        {visibleStops.length > 0 && resolvedPlaceCount !== 1 && (
          <ol className={`mt-2 flex min-w-0 ${compact ? 'gap-1' : 'gap-1.5'} overflow-hidden`} aria-label="코스 순서">
            {visibleStops.map((name, index) => (
              <li key={`${name}-${index}`} className="min-w-0 max-w-[46%] truncate rounded-full border border-white/20 bg-black/30 px-2 py-1 text-[9px] font-bold backdrop-blur-sm">
                {index + 1}. {name}
              </li>
            ))}
            {resolvedPlaceCount && resolvedPlaceCount > visibleStops.length && (
              <li className="shrink-0 rounded-full border border-white/20 bg-black/30 px-2 py-1 text-[9px] font-bold backdrop-blur-sm">
                +{resolvedPlaceCount - visibleStops.length}
              </li>
            )}
          </ol>
        )}

        {cleanedCaption && (
          <p className={`${compact ? 'mt-2 line-clamp-1 text-[10px]' : 'mt-3 line-clamp-2 text-[12px]'} border-l-2 border-[#FF8D82] pl-2 font-semibold leading-relaxed text-white/90`}>
            {cleanedCaption}
          </p>
        )}
      </div>
    </section>
  );
}
