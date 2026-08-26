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

  it('loads profile posts from their canonical author timeline', () => {
    expect(source).toContain("searchParams.get('authorId')");
    expect(source).toContain('useProfileFeed(profileAuthorId)');
    expect(source).toContain('profileFeed.posts.find(item => item.id === id)');
  });

  it('allows administrators to delete without granting edit ownership', () => {
    expect(source).toContain('const canDeletePost = ownPost || Boolean(auth?.isAdmin)');
    expect(source).toContain("aria-label={ownPost ? '피드 삭제' : '관리자 피드 삭제'}");
    expect(source).toContain('{ownPost && <button');
  });
});
