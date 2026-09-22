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

    expect(markup).toContain("Open in Google Maps");
    expect(markup).toContain('target="_blank"');
    expect(markup).toContain("Follow all 3 places in order.");
    expect(markup).toContain('Check travel times in Google Maps.');
    expect(markup).not.toContain('정확한 일정');
  });

  it('disables the action and explains when route data is unavailable', () => {
    const markup = renderToStaticMarkup(
      <CourseDirectionsAction href={null} stopCount={0} />,
    );

    expect(markup).toContain('disabled=""');
    expect(markup).toContain("Directions unavailable");
    expect(markup).toContain("Some places are missing location details");
    expect(markup).toContain('directions aren&#x27;t available.');
    expect(markup).not.toContain('href=');
  });
});
