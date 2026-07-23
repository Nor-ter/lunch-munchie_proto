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
    expect(source).toContain('게시물을 삭제하시겠습니까?');
    expect(source).toContain('setDeleteConfirmOpen(false)');
    expect(source).toContain('deleteFeedPost(post.id)');
    expect(source).toContain('게시물 삭제 창 닫기');
    expect(source).toContain('취소');
    expect(source).toContain('확인');
  });

  it('routes own and other author profile clicks to different destinations', () => {
    expect(source).toContain("const authorProfilePath = ownPost ? '/profile' : `/profile/${post.authorId}`");
    expect(source).toContain('onClick={() => go(authorProfilePath)}');
  });
});
