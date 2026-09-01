import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(join(import.meta.dirname, 'FeedDetailPage.tsx'), 'utf8');
const cardSource = readFileSync(join(import.meta.dirname, '../components/munchie/UnifiedMunchieCard.tsx'), 'utf8');

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

  it('centers the header title without owner edit and delete actions', () => {
    expect(source).toContain('grid grid-cols-[40px_1fr_40px] items-center');
    expect(source).toContain('text-center text-[15px] font-black');
    expect(source).toContain("import BackButton from '@/components/ui/BackButton'");
    expect(source).toContain('pt-[max(12px,env(safe-area-inset-top))]');
    expect(source).not.toContain('aria-label="피드 수정"');
    expect(source).not.toContain('aria-label="피드 삭제"');
    expect(source).not.toContain('deletePost');
  });

  it('keeps the feed detail surface mobile-width', () => {
    expect(source).toContain('mx-auto min-h-dvh max-w-[430px] bg-[#FCF4EE]');
  });

  it('keeps owner edit and delete actions in the card menu', () => {
    expect(cardSource).toContain('aria-label="게시물 메뉴"');
    expect(cardSource).toContain('게시물 수정');
    expect(cardSource).toContain('게시물 삭제');
    expect(cardSource).toContain('confirmPostDelete');
    expect(cardSource).toContain('const canDeletePost = ownPost || Boolean(auth?.isAdmin)');
    expect(cardSource).toContain('관리자 삭제');
  });

  it('builds the Google Maps handoff from the canonical feed stop order', () => {
    expect(source).toContain("import CourseDirectionsAction from '@/components/course/CourseDirectionsAction'");
    expect(source).toContain('routePlaces.map(place =>');
    expect(source).toContain('googlePlaceIdFromRestaurantId(place.id)');
    expect(source).toContain('href={directionsUrl}');
    expect(source).toContain('onNavigate={handleDirectionsOpen}');
  });

  it('renders a dedicated story, copy, ordered course map, and directions flow', () => {
    expect(source).toContain('data-ui="feed-detail-story"');
    expect(source).toContain('<FoodHeroCourseOverlay');
    expect(source).toContain('data-ui="feed-detail-copy"');
    expect(source).toContain('data-ui="feed-detail-course-map"');
    expect(source).toContain('<FeedCourseMap places={routePlaces}');
    expect(source).toContain('routePlaces.map((place, index) =>');
    expect(source).toContain('hideHero');
  });
});
