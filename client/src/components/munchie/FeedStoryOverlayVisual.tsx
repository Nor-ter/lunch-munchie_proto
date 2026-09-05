import React from 'react';
import type { FeedStoryOverlay } from '@/lib/feedStory';
import { getCurvedCourseSegments } from '@/lib/courseMapSync';

export interface FeedStoryOverlayPlace {
  id: string;
  name?: string | null;
}

const toneClasses: Record<FeedStoryOverlay['tone'], string> = {
  light: 'text-white [text-shadow:0_2px_10px_rgba(0,0,0,0.78)]',
  dark: 'rounded-xl border border-white/10 bg-black/55 px-3 py-2 text-white shadow-lg backdrop-blur-sm',
  accent: 'rounded-xl border border-white/15 bg-[#F25055]/90 px-3 py-2 text-white shadow-lg backdrop-blur-sm',
};

const sizeClasses: Record<FeedStoryOverlay['size'], string> = {
  sm: 'text-[clamp(10px,3.2cqw,13px)] leading-[1.34]',
  md: 'text-[clamp(12px,4.4cqw,18px)] leading-[1.26]',
  lg: 'text-[clamp(17px,7.2cqw,31px)] leading-[1.07]',
};

const gridSizeClasses: Record<FeedStoryOverlay['size'], Record<'short' | 'regular' | 'long', string>> = {
  sm: {
    short: 'text-[clamp(9px,3.6cqw,11px)] leading-[1.18]',
    regular: 'text-[clamp(8px,3.1cqw,10px)] leading-[1.2]',
    long: 'text-[clamp(7px,2.8cqw,9px)] leading-[1.22]',
  },
  md: {
    short: 'text-[clamp(11px,5.1cqw,14px)] leading-[1.12]',
    regular: 'text-[clamp(10px,4.3cqw,12px)] leading-[1.16]',
    long: 'text-[clamp(9px,3.7cqw,11px)] leading-[1.18]',
  },
  lg: {
    short: 'text-[clamp(14px,7.5cqw,18px)] leading-[1.02]',
    regular: 'text-[clamp(12px,6.2cqw,16px)] leading-[1.06]',
    long: 'text-[clamp(10px,5.1cqw,14px)] leading-[1.08]',
  },
};

const gridToneClasses: Record<FeedStoryOverlay['tone'], string> = {
  light: 'text-white [text-shadow:0_1px_5px_rgba(0,0,0,0.9)]',
  dark: 'rounded-md border border-white/10 bg-black/55 px-1.5 py-1 text-white shadow backdrop-blur-sm',
  accent: 'rounded-md border border-white/15 bg-[#F25055]/90 px-1.5 py-1 text-white shadow backdrop-blur-sm',
};

const alignClasses: Record<FeedStoryOverlay['align'], string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
};

const kindClasses: Record<FeedStoryOverlay['kind'], string> = {
  course_map: 'font-bold',
  food_name: 'font-black tracking-[-0.035em]',
  restaurant_name: 'font-extrabold tracking-[0.025em]',
  price: 'font-black tabular-nums tracking-[-0.02em]',
  review: 'font-semibold',
  text: 'font-bold',
};

const cleanText = (value: string | null | undefined) => value?.trim() || undefined;

function gridTextLength(value: string | undefined) {
  return Array.from(value ?? '').reduce((length, character) => (
    length + (/\s/.test(character) ? 0.35 : /[\x00-\x7F]/.test(character) ? 0.58 : 1)
  ), 0);
}

function gridTextSizeClass(size: FeedStoryOverlay['size'], value: string | undefined) {
  const length = gridTextLength(value);
  const density = length <= 9 ? 'short' : length <= 20 ? 'regular' : 'long';
  return gridSizeClasses[size][density];
}

function FeedStoryCourseMap({
  places,
  size,
  compact,
  grid,
}: {
  places: FeedStoryOverlayPlace[];
  size: FeedStoryOverlay['size'];
  compact: boolean;
  grid: boolean;
}) {
  const visible = places.slice(0, 3);
  const points = visible.map((_, index) => ({
    x: visible.length === 1 ? 50 : 10 + (index * 80) / Math.max(visible.length - 1, 1),
    y: index % 2 === 0 ? 13 : 29,
  }));
  const segments = getCurvedCourseSegments(points);
  const showLabels = !compact && size !== 'sm';

  return (
    <span data-overlay-content="course-map" className="block w-full drop-shadow-[0_3px_8px_rgba(0,0,0,0.34)]">
      <svg
        viewBox="0 0 100 42"
        className={`${grid ? 'h-[clamp(18px,8cqw,26px)]' : 'h-[clamp(30px,10cqw,44px)]'} w-full overflow-visible`}
        aria-hidden="true"
      >
        {segments.map((segment, index) => (
          <g key={`${visible[index]?.id}-${visible[index + 1]?.id}`}>
            <path d={segment.path} fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
            <path d={segment.path} fill="none" stroke="#FF6534" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" />
            <path d={segment.path} fill="none" stroke="rgba(255,255,255,0.72)" strokeWidth="0.9" strokeDasharray="4 4" strokeLinecap="round" />
          </g>
        ))}
        {points.map((point, index) => (
          <g key={visible[index]?.id ?? index}>
            <circle cx={point.x} cy={point.y} r="6.4" fill="rgba(255,101,52,0.24)" />
            <circle cx={point.x} cy={point.y} r="5" fill="#FF6534" stroke="white" strokeWidth="1.8" />
            <text x={point.x} y={point.y + 1.8} textAnchor="middle" fontSize="4.8" fontWeight="900" fill="white">
              {index + 1}
            </text>
          </g>
        ))}
      </svg>
      {showLabels && (
          <span className="flex min-w-0 items-center gap-1 overflow-hidden text-[clamp(9px,2.8cqw,11px)] leading-tight" aria-label="코스 순서">
          {visible.length > 0
            ? visible.map((place, index) => (
                <span key={place.id} className="min-w-0 max-w-[46%] truncate">
                  {index + 1}. {cleanText(place.name) ?? '장소'}
                </span>
              ))
            : <span>코스 장소를 먼저 선택해 주세요</span>}
          {places.length > visible.length && <span className="shrink-0">+{places.length - visible.length}</span>}
        </span>
      )}
    </span>
  );
}

export default function FeedStoryOverlayVisual({
  overlay,
  places = [],
  compact = false,
  grid = false,
  fallbackText,
}: {
  overlay: FeedStoryOverlay;
  places?: FeedStoryOverlayPlace[];
  compact?: boolean;
  grid?: boolean;
  fallbackText?: string;
}) {
  const text = cleanText(overlay.text) ?? cleanText(fallbackText);

  return (
    <span
      data-overlay-size={overlay.size}
      data-overlay-tone={overlay.tone}
      className={`block w-full break-words ${grid ? gridToneClasses[overlay.tone] : toneClasses[overlay.tone]} ${grid ? gridTextSizeClass(overlay.size, text) : sizeClasses[overlay.size]} ${alignClasses[overlay.align]} ${kindClasses[overlay.kind]}`}
    >
      {overlay.kind === 'course_map'
        ? <FeedStoryCourseMap places={places} size={overlay.size} compact={compact} grid={grid} />
        : overlay.kind === 'review'
          ? <span className={`${grid ? 'line-clamp-3 border-l pl-1' : 'border-l-2 pl-2'} block border-[#FF8D82]`}>{text}</span>
          : <span className={grid ? overlay.kind === 'price' ? 'line-clamp-1' : 'line-clamp-2 text-balance' : undefined}>{text}</span>}
    </span>
  );
}
