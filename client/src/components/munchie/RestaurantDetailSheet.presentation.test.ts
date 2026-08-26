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
    expect(source).toContain('<BackButton onClick={onClose}');
    expect(source).toContain('isModal ? <X size={18} aria-hidden="true" /> : undefined');
  });
});
