import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import CourseDirectionsAction from './CourseDirectionsAction';

describe('CourseDirectionsAction', () => {
  it('renders a clear external Google Maps CTA without claiming an exact schedule', () => {
    const markup = renderToStaticMarkup(
      <CourseDirectionsAction
        href="https://www.google.com/maps/dir/?api=1&destination=Melbourne"
        stopCount={3}
      />,
    );

    expect(markup).toContain('Google 지도에서 길찾기');
    expect(markup).toContain('target="_blank"');
    expect(markup).toContain('저장된 3곳 순서대로 경로를 엽니다.');
    expect(markup).toContain('실제 이동 시간은 Google 지도에서 확인하세요.');
    expect(markup).not.toContain('정확한 일정');
  });

  it('disables the action and explains when route data is unavailable', () => {
    const markup = renderToStaticMarkup(
      <CourseDirectionsAction href={null} stopCount={0} />,
    );

    expect(markup).toContain('disabled=""');
    expect(markup).toContain('길찾기 정보 없음');
    expect(markup).toContain('모든 장소에 주소 또는 좌표가 있어야');
    expect(markup).toContain('순서를 보존한 길찾기');
    expect(markup).not.toContain('href=');
  });
});
