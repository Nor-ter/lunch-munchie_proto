import React from 'react';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import FoodHeroCourseOverlay, { getAuthorPhotoSources, resolveGridStoryRatio } from './FoodHeroCourseOverlay';

describe('FoodHeroCourseOverlay', () => {
  it('renders a one-stop course from the author photo with useful restaurant details', () => {
    const html = renderToStaticMarkup(
      <FoodHeroCourseOverlay
        photos={['https://images.example/author-bowl.jpg']}
        title="점심 한 그릇"
        caption="국물이 정말 좋았어요"
        stops={[{
          id: 'restaurant-1',
          name: '담소국밥',
          category: '한식',
          address: '서울 중구 세종대로 1',
        }]}
        placeCount={1}
        distanceKm={1.2}
        durationMinutes={45}
      />,
    );

    expect(html).toContain('data-state="photo"');
    expect(html).toContain('data-story-ratio="4:5"');
    expect(html).toContain('aspect-[4/5]');
    expect(html).toContain('src="https://images.example/author-bowl.jpg"');
    expect(html).toContain('1곳 코스');
    expect(html).toContain('담소국밥');
    expect(html).toContain('한식');
    expect(html).toContain('서울 중구 세종대로 1');
    expect(html).toContain('1.2km');
    expect(html).toContain('45분');
    expect(html).toContain('국물이 정말 좋았어요');
  });

  it('renders an ordered summary for a multi-stop course', () => {
    const html = renderToStaticMarkup(
      <FoodHeroCourseOverlay
        photos={['https://images.example/author-course.jpg']}
        title="을지로 저녁 코스"
        stops={[
          { id: 'restaurant-1', name: '을지식당' },
          { id: 'restaurant-2', name: '골목 디저트' },
          { id: 'restaurant-3', name: '밤 카페' },
        ]}
        placeCount={3}
        durationMinutes={150}
      />,
    );

    expect(html).not.toContain('3곳 코스');
    expect(html).toContain('을지로 저녁 코스');
    expect(html).toContain('data-overlay-content="course-map"');
    expect(html).toContain('stroke="#FF6534"');
    expect(html).toContain('을지식당');
    expect(html).toContain('2시간 30분');
  });

  it('hides absent metadata and uses an explicit empty state instead of another image', () => {
    const html = renderToStaticMarkup(
      <FoodHeroCourseOverlay
        photos={['', '   ', null]}
        stops={[{ id: 'restaurant-1', name: '사진 없는 식당', category: null, address: null }]}
        placeCount={1}
        distanceKm={Number.NaN}
        durationMinutes={0}
      />,
    );

    expect(html).toContain('data-state="empty"');
    expect(html).toContain('작성자가 등록한 음식 사진이 없어요');
    expect(html).toContain('코스 정보만 확인할 수 있어요');
    expect(html).not.toContain('<img');
    expect(html).not.toContain('km');
    expect(html).not.toContain('분</span>');
    expect(html).not.toContain('undefined');
    expect(html).not.toContain('null');
  });

  it('deduplicates and trims only the supplied author photo sources', () => {
    expect(getAuthorPhotoSources([
      ' https://images.example/a.jpg ',
      'https://images.example/a.jpg',
      null,
      '',
      'https://images.example/b.jpg',
    ])).toEqual([
      'https://images.example/a.jpg',
      'https://images.example/b.jpg',
    ]);
  });

  it('renders only the active photo custom overlays with accessible slide controls', () => {
    const html = renderToStaticMarkup(
      <FoodHeroCourseOverlay
        photos={['/photos/uploads/author/first.jpg', '/photos/uploads/author/second.jpg']}
        slides={[
          {
            id: 'first',
            photo: '/photos/uploads/author/first.jpg',
            overlays: [
              { id: 'food', kind: 'food_name', text: '트러플 파스타', x: 50, y: 70, width: 80, tone: 'light', size: 'lg', align: 'left' },
              { id: 'price', kind: 'price', text: '$24', x: 50, y: 82, width: 80, tone: 'accent', size: 'md', align: 'right' },
            ],
          },
          {
            id: 'second',
            photo: '/photos/uploads/author/second.jpg',
            overlays: [
              { id: 'review', kind: 'review', text: '두 번째 사진만의 한줄평', x: 50, y: 88, width: 85, tone: 'dark', size: 'md', align: 'left' },
            ],
          },
        ]}
        title="저녁 코스"
      />,
    );

    expect(html).toContain('src="/photos/uploads/author/first.jpg"');
    expect(html).toContain('data-overlay-kind="food_name"');
    expect(html).toContain('트러플 파스타');
    expect(html).toContain('$24');
    expect(html).not.toContain('두 번째 사진만의 한줄평');
    expect(html).toContain('aria-label="이전 음식 사진"');
    expect(html).toContain('aria-label="다음 음식 사진"');
    expect(html).toContain('1 / 2');
    expect(html).toContain('tabindex="0"');
    expect(html).toContain('focus-visible:ring-4');
  });

  it('uses explicit photo attribution for legacy overlays instead of the stop index', () => {
    const html = renderToStaticMarkup(
      <FoodHeroCourseOverlay
        photos={['/photos/uploads/author/cafe.jpg', '/photos/uploads/author/meal.jpg']}
        slides={[]}
        photoRestaurantIds={['cafe', 'meal']}
        stops={[
          { id: 'meal', name: '점심 식당' },
          { id: 'cafe', name: '후식 카페' },
        ]}
      />,
    );

    expect(html).toMatch(/data-overlay-kind="restaurant_name"[\s\S]*?후식 카페/);
  });

  it('keeps compact cards at 4:5 while preserving the responsive type hierarchy', () => {
    const html = renderToStaticMarkup(
      <FoodHeroCourseOverlay
        compact
        photos={['/photos/uploads/author/compact.jpg']}
        slides={[{
          id: 'compact',
          photo: '/photos/uploads/author/compact.jpg',
          overlays: [{ id: 'title', kind: 'food_name', text: '큰 음식명', x: 70, y: 23, width: 44, tone: 'light', size: 'lg', align: 'center' }],
        }]}
      />,
    );

    expect(html).toContain('data-story-ratio="4:5"');
    expect(html).toContain('aspect-[4/5]');
    expect(html).toContain('data-overlay-size="lg"');
    expect(html).toContain('text-[clamp(16px,7cqw,30px)]');
  });

  it('uses a collision-resistant overlay scale and removes top chrome in discovery grid tiles', () => {
    const html = renderToStaticMarkup(
      <FoodHeroCourseOverlay
        compact
        grid
        photos={['/photos/uploads/author/grid.jpg', '/photos/uploads/author/grid-2.jpg']}
        slides={[{
          id: 'grid',
          photo: '/photos/uploads/author/grid.jpg',
          overlays: [
            { id: 'title', kind: 'food_name', text: 'Hand made dumplings', x: 76, y: 20, width: 42, tone: 'light', size: 'lg', align: 'center' },
            { id: 'review', kind: 'review', text: 'Brunswick East에서 수제 만두로 시작', x: 71, y: 55, width: 48, tone: 'light', size: 'md', align: 'left' },
          ],
        }]}
        placeCount={1}
      />,
    );

    expect(html).toContain('data-presentation="grid"');
    expect(html).toContain('text-[clamp(11px,5.8cqw,15px)]');
    expect(html).toContain('text-[clamp(9px,4cqw,11px)]');
    expect(html).toContain('line-clamp-3');
    expect(html).toContain('left:67%');
    expect(html).toContain('width:58%');
    expect(html).not.toContain('1곳 코스');
    expect(html).not.toContain('aria-live="polite" aria-atomic="true" class="px-1 py-1"');
  });

  it('gives each grid story a stable height based on its maximum content density', () => {
    const slide = (count: number, text = '한입') => [{
      id: `slide-${count}`,
      photo: `/photo-${count}.jpg`,
      overlays: Array.from({ length: count }, (_, index) => ({
        id: `overlay-${index}`,
        kind: 'text' as const,
        text,
        x: 50,
        y: 20 + index * 10,
        width: 60,
        tone: 'light' as const,
        size: 'md' as const,
        align: 'left' as const,
      })),
    }];

    expect(resolveGridStoryRatio(slide(1))).toEqual({ label: '1:1', className: 'aspect-square' });
    expect(resolveGridStoryRatio(slide(2))).toEqual({ label: '7:8', className: 'aspect-[7/8]' });
    expect(resolveGridStoryRatio(slide(4))).toEqual({ label: '4:5', className: 'aspect-[4/5]' });
    expect(resolveGridStoryRatio(slide(6, '한입 메뉴'))).toEqual({ label: '3:4', className: 'aspect-[3/4]' });
    expect(resolveGridStoryRatio(slide(2, '내용이 아주 길어서 더 많은 세로 공간이 필요한 설명입니다'))).toEqual({ label: '4:5', className: 'aspect-[4/5]' });
  });

  it('keeps a failed slide in place and stops a real swipe before the parent like handler', () => {
    const source = readFileSync(new URL('./FoodHeroCourseOverlay.tsx', import.meta.url), 'utf8');
    expect(source).toContain("current.includes(activeSlide.id) ? current : [...current, activeSlide.id]");
    expect(source).toContain('다른 사진으로 자동 대체하지 않아요');
    expect(source).toContain('Math.abs(deltaX) >= 44');
    expect(source).toContain('event.stopPropagation()');
    expect(source).toContain("event.key === 'ArrowRight'");
    expect(source).toContain('role="status" aria-live="polite" aria-atomic="true"');
  });
});
