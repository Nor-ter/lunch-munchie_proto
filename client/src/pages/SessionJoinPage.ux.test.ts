import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(join(import.meta.dirname, 'SessionJoinPage.tsx'), 'utf8');

describe('SessionJoinPage invitation UX', () => {
  it('keeps the invitation profile picker visible while only dietary settings collapse', () => {
    expect(source).toContain('내 캐릭터 선택');
    expect(source).toContain('EMOJIS.slice(0, 16).map');
    expect(source).toContain('사용할 닉네임');
    expect(source).not.toContain('profileEditorOpen');
    expect(source).not.toContain('현재 참여 정보');
    expect(source).toContain('dietaryOpen');
    expect(source).toContain('선택 사항');
    expect(source).toContain('selectedDietaryOptions.length');
  });

  it('keeps one clear join CTA and preserves the allergy warning', () => {
    expect(source).toContain("'🎉 세션 참여하기'");
    expect(source).not.toContain('비회원으로 세션 참가하기');
    expect(source).toContain('심한 알레르기는 매장에 재료와 교차오염 여부를 꼭 확인해주세요.');
  });
});
