import React from 'react';
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
});
