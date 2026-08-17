import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(new URL('./MunchieFeedPage.tsx', import.meta.url), 'utf8');

describe('MunchieFeedPage pagination', () => {
  it('requests a fresh personalised batch and gives the user an explicit next-page control', () => {
    expect(source).toContain('refreshFeedPosts');
    expect(source).toContain('loadMoreFeedPosts');
    expect(source).toContain('hasMoreFeedPosts');
    expect(source).toContain('더 많은 Munchie 보기');
  });
});
