import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(join(import.meta.dirname, 'CourseDetailPage.tsx'), 'utf8');

describe('CourseDetailPage origin-specific actions', () => {
  it('shows feed sharing in the top-right and keeps like/save in the bottom bar', () => {
    expect(source).toContain('onClick={handleCourseShare}');
    expect(source).toContain("from === 'feed' || isSavedOrigin");
    expect(source).toContain('aria-label="코스 공유하기"');
    expect(source).toContain('onClick={toggleCourseSaved}');
    expect(source).toContain("{isCourseSaved ? '저장됨' : '저장하기'}");
    expect(source).toContain('className="page-bottom-action-primary gap-2"');
    expect(source).not.toContain("!bg-[#A96A61]");
    expect(source).toContain('navigator.share({');
    expect(source).toContain('navigator.clipboard.writeText(shareUrl)');
  });

  it('shows copy-to-edit only in the saved-origin bottom action branch', () => {
    expect(source).toContain(') : isSavedOrigin ? (');
    expect(source).toContain('복사해서 편집');
    expect(source).toContain("return from === 'saved'");
  });

  it('replaces the saved-origin follow action with native sharing', () => {
    const savedBranch = source.indexOf("{from === 'feed' || isSavedOrigin ? (");
    const shareAction = source.indexOf('aria-label="코스 공유하기"', savedBranch);
    const followBranch = source.indexOf('<FollowButton', savedBranch);

    expect(savedBranch).toBeGreaterThan(-1);
    expect(shareAction).toBeGreaterThan(savedBranch);
    expect(followBranch).toBeGreaterThan(shareAction);
    expect(source.slice(savedBranch, followBranch)).not.toContain('공유\n');
  });
});
