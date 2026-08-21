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

  it('lets the user pin a map center, choose a kilometre radius, apply it, and clear it', () => {
    expect(source).toContain("import FeedRadiusMap");
    expect(source).toContain('data-ui="feed-radius-filter"');
    expect(source).toContain('onCenterChange={setDraftCenter}');
    expect(source).toContain('useLocationSearch(draftCenter ?? undefined)');
    expect(source).toContain('await getLocationDetails(placeId, locationSearch.sessionToken)');
    expect(source).toContain('setDraftCenter({ lat: location.latitude, lng: location.longitude })');
    expect(source).toContain('aria-label="기준 위치 검색"');
    expect(source).toContain('type="range"');
    expect(source).toContain('await refreshFeedPosts(next)');
    expect(source).toContain('await refreshFeedPosts(null)');
    expect(source).toContain("'이 반경에는 피드가 없어요'");
    expect(source).not.toContain('지도를 눌러 기준 위치를 정하세요');
    expect(source).not.toContain('>카테고리<');
  });
});
