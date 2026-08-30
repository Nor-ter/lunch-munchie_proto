import React from 'react';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import FoodHeroCourseOverlay, { getAuthorPhotoSources } from './FoodHeroCourseOverlay';

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

    expect(html).toContain('3곳 코스');
    expect(html).toContain('을지로 저녁 코스');
    expect(html).toContain('1. 을지식당');
    expect(html).toContain('2. 골목 디저트');
    expect(html).toContain('3. 밤 카페');
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

    expect(html).toMatch(/data-overlay-kind="restaurant_name"[^>]*><span>후식 카페<\/span>/);
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
