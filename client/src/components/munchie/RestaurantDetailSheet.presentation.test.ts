import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(join(import.meta.dirname, 'RestaurantDetailSheet.tsx'), 'utf8');

describe('RestaurantDetailSheet presentation', () => {
  it('supports an inset popup presentation for saved map place details', () => {
    expect(source).toContain("presentation?: 'fullscreen' | 'modal'");
    expect(source).toContain("const isModal = presentation === 'modal'");
    expect(source).toContain('inset-x-[10%] inset-y-[10dvh]');
    expect(source).toContain("aria-modal={isModal || undefined}");
    expect(source).toContain("isModal ? 'h-[160px]' : 'h-[220px]'");
    expect(source).toContain("aria-label={isModal ? '상세정보 닫기' : '뒤로가기'}");
    expect(source).toContain('isModal ? <X size={18} /> : <ChevronLeft size={20} />');
  });

  it('does not render a broken hero image when the Google pin has no cached photo yet', () => {
    expect(source).toContain('fetchRestaurantById(restaurantId)');
    expect(source).toContain('heroSrc ? (');
    expect(source).not.toContain('<img src={restaurant.image}');
    expect(source).toContain('등록된 메뉴 사진이 없어요.');
  });
});
