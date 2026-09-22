import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(join(import.meta.dirname, 'UnifiedMunchieCard.tsx'), 'utf8');

describe('UnifiedMunchieCard ownership menu', () => {
  it('keeps edit owner-only while allowing an authenticated administrator to delete', () => {
    expect(source).toContain('const ownPost = isMyPost(post)');
    expect(source).toContain('const canDeletePost = ownPost || Boolean(auth?.isAdmin)');
    expect(source).toContain('{ownPost ? (');
    expect(source).toContain("Edit post");
    expect(source).toContain("Delete post");
    expect(source).toContain("Delete as admin");
    expect(source).toContain("View profile");
    expect(source).toContain("Report post");
  });

  it('requires confirmation before deleting and supports all close paths', () => {
    const deleteFlow = source.slice(
      source.indexOf('const confirmPostDelete = async () =>'),
      source.indexOf('const togglePostLike = async () =>'),
    );
    expect(source).toContain("Delete this post?");
    expect(source).toContain('setDeleteConfirmOpen(false)');
    expect(deleteFlow).toContain("method: 'DELETE'");
    expect(deleteFlow).toContain('credentials: \'same-origin\'');
    expect(deleteFlow).toContain('if (!response.ok)');
    expect(deleteFlow).toContain('deleteCourseWithFeed(course.id)');
    expect(deleteFlow.indexOf('if (!response.ok)')).toBeLessThan(deleteFlow.indexOf('deleteCourseWithFeed(course.id)'));
    expect(source).toContain("Close delete confirmation");
    expect(source).toContain("Cancel");
    expect(source).toContain("OK");
  });

  it('routes own and other author profile clicks to different destinations', () => {
    expect(source).toContain("const authorProfilePath = ownPost ? '/profile' : `/profile/${resolveFeedAuthorId(post)}`");
    expect(source).toContain('onClick={() => go(authorProfilePath)}');
  });
});
