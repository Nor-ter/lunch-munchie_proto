import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const pageSources = [
  readFileSync(join(import.meta.dirname, 'FeedDetailPage.tsx'), 'utf8'),
  readFileSync(join(import.meta.dirname, 'course/CourseFeedsPage.tsx'), 'utf8'),
];

describe('Munchie feed viewing page layout', () => {
  it('keeps feed viewing pages full width inside the app shell', () => {
    for (const source of pageSources) {
      expect(source).not.toContain('mx-auto min-h-dvh max-w-[430px] bg-[#FCF4EE]');
    }
  });
});
