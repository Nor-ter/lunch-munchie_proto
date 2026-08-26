import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(join(import.meta.dirname, 'FeedDetailPage.tsx'), 'utf8');
const cardSource = readFileSync(join(import.meta.dirname, '../components/munchie/UnifiedMunchieCard.tsx'), 'utf8');

describe('FeedDetailPage saved view navigation', () => {
  it('passes map origin through to the course card', () => {
    expect(source).toContain("get('savedView') === 'map'");
    expect(source).toContain('savedView={savedView}');
    expect(source).toContain('getSavedReturnPath(search, id)');
  });

  it('centers the header title without owner edit and delete actions', () => {
    expect(source).toContain('grid grid-cols-[40px_1fr_40px] items-center');
    expect(source).toContain('text-center text-[15px] font-black');
    expect(source).toContain("import BackButton from '@/components/ui/BackButton'");
    expect(source).toContain('pt-[max(12px,env(safe-area-inset-top))]');
    expect(source).not.toContain('aria-label="피드 수정"');
    expect(source).not.toContain('aria-label="피드 삭제"');
    expect(source).not.toContain('deletePost');
  });

  it('keeps the feed detail surface mobile-width', () => {
    expect(source).toContain('mx-auto min-h-dvh max-w-[430px] bg-[#FCF4EE]');
  });

  it('keeps owner edit and delete actions in the card menu', () => {
    expect(cardSource).toContain('aria-label="게시물 메뉴"');
    expect(cardSource).toContain('게시물 수정');
    expect(cardSource).toContain('게시물 삭제');
    expect(cardSource).toContain('confirmPostDelete');
  });
});
