import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(join(import.meta.dirname, 'UnifiedMunchieCard.tsx'), 'utf8');

describe('UnifiedMunchieCard ownership menu', () => {
  it('shows edit/delete actions only in the own-post branch', () => {
    expect(source).toContain('const ownPost = isMyPost(post)');
    expect(source).toContain('{ownPost ? (');
    expect(source).toContain('게시물 수정');
    expect(source).toContain('게시물 삭제');
    expect(source).toContain('작성자 보기');
    expect(source).toContain('게시물 신고');
  });

  it('requires confirmation before deleting and supports all close paths', () => {
    const deleteFlow = source.slice(
      source.indexOf('const confirmPostDelete = async () =>'),
      source.indexOf('const togglePostLike = async () =>'),
    );
    expect(source).toContain('게시물을 삭제하시겠습니까?');
    expect(source).toContain('setDeleteConfirmOpen(false)');
    expect(deleteFlow).toContain("method: 'DELETE'");
    expect(deleteFlow).toContain('credentials: \'same-origin\'');
    expect(deleteFlow).toContain('if (!response.ok)');
    expect(deleteFlow).toContain('deleteCourseWithFeed(course.id)');
    expect(deleteFlow.indexOf('if (!response.ok)')).toBeLessThan(deleteFlow.indexOf('deleteCourseWithFeed(course.id)'));
    expect(source).toContain('게시물 삭제 창 닫기');
    expect(source).toContain('취소');
    expect(source).toContain('확인');
  });

  it('routes own and other author profile clicks to different destinations', () => {
    expect(source).toContain("const authorProfilePath = ownPost ? '/profile' : `/profile/${resolveFeedAuthorId(post)}`");
    expect(source).toContain('onBeforeAuthorProfileNavigate?.()');
    expect(source).toContain('navigate(authorProfilePath)');
    expect(source).toContain('onClick={goToAuthorProfile}');
  });
});
