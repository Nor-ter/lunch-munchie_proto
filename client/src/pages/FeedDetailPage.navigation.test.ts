import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(join(import.meta.dirname, 'FeedDetailPage.tsx'), 'utf8');

describe('FeedDetailPage saved view navigation', () => {
  it('passes map origin through to the course card', () => {
    expect(source).toContain("get('savedView') === 'map'");
    expect(source).toContain('savedView={savedView}');
    expect(source).toContain('getSavedReturnPath(search, id)');
  });

  it('centers the header title without owner edit and delete actions', () => {
    expect(source).toContain('grid grid-cols-[40px_1fr_40px] items-center');
    expect(source).toContain('text-center text-[15px] font-black');
    expect(source).not.toContain('aria-label="피드 수정"');
    expect(source).not.toContain('aria-label="피드 삭제"');
    expect(source).not.toContain('deletePost');
  });

  it('keeps the feed detail surface full width without the old side gutters', () => {
    expect(source).toContain('<main className="min-h-dvh bg-[#FCF4EE] pb-8">');
    expect(source).not.toContain('mx-auto min-h-dvh max-w-[430px] bg-[#FCF4EE]');
  });
});
