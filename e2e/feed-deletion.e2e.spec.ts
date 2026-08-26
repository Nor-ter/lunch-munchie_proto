import { expect, test, type Page } from 'playwright/test';

const USER_ID = 'feed-delete-owner';
const COURSE_ID = 'course-delete-e2e';
const POST_ID = `post_${COURSE_ID}`;

const course = {
  id: COURSE_ID,
  title: '삭제 테스트 코스',
  description: '삭제 후 다시 나오면 안 돼요.',
  heroImage: '',
  tags: ['맛집'],
  hashtags: [],
  region: 'Melbourne',
  metadata: { distance: 0, duration: 0, placeCount: 0 },
  creatorId: USER_ID,
  savedCount: 0,
  isPublic: true,
  createdAt: new Date().toISOString(),
  stops: [],
};

const feedPost = {
  id: POST_ID,
  courseId: COURSE_ID,
  creatorId: USER_ID,
  authorName: '삭제 테스터',
  authorImage: null,
  title: course.title,
  description: course.description,
  heroImage: '',
  photos: [],
  decor: [],
  templateId: null,
  tags: course.tags,
  stops: [],
  likesCount: 0,
  savesCount: 0,
  commentsCount: 0,
  comments: [],
  createdAt: course.createdAt,
};

async function mockFeedApi(page: Page) {
  let deleted = false;
  let deleteRequests = 0;

  await page.route('**/api/**', async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.pathname === '/api/auth/session') {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          user: { sub: USER_ID, name: '삭제 테스터', email: 'delete@example.com' },
          profile: { id: USER_ID, username: '삭제 테스터', handle: 'delete_test', profile_image_url: null },
        }),
      });
      return;
    }
    if (url.pathname === '/api/feed-post' && request.method() === 'DELETE') {
      expect(url.searchParams.get('courseId')).toBe(COURSE_ID);
      deleteRequests += 1;
      deleted = true;
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ ok: true, deletedCourseId: COURSE_ID }) });
      return;
    }
    if (url.pathname === '/api/feed') {
      const items = deleted ? [] : [feedPost];
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ items, nextCursor: null, hasMore: false }),
      });
      return;
    }
    if (url.pathname === '/api/courses') {
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify(deleted ? [] : [course]) });
      return;
    }
    if (url.pathname === '/api/restaurants') {
      await route.fulfill({ contentType: 'application/json', body: '[]' });
      return;
    }
    await route.fulfill({ contentType: 'application/json', body: '{}' });
  });

  await page.addInitScript(({ userId, stalePost }) => {
    localStorage.setItem('lm_last_auth_uid_v1', userId);
    localStorage.setItem('lm_profile', JSON.stringify({
      id: userId,
      name: '삭제 테스터',
      handle: 'delete_test',
      emoji: '😊',
      dietary: [],
      categoryPrefs: [],
      totalSwipes: 0,
      totalLikes: 0,
      joinedAt: new Date().toISOString(),
    }));
    // Reproduce the old browser cache that previously brought a deleted post back.
    localStorage.setItem('lm_feed_v3', JSON.stringify([{
      id: stalePost.id,
      courseId: stalePost.courseId,
      authorId: stalePost.creatorId,
      authorName: stalePost.authorName,
      authorEmoji: '😊',
      photos: [],
      caption: stalePost.description,
      skinId: 'default',
      likes: 0,
      dislikes: 0,
      saves: 0,
      comments: [],
      tags: stalePost.tags,
      createdAt: stalePost.createdAt,
    }]));
  }, { userId: USER_ID, stalePost: feedPost });

  return { deleteRequests: () => deleteRequests };
}

test('deleting from the feed menu permanently removes the server post and stale browser cache', async ({ page }) => {
  const api = await mockFeedApi(page);
  await page.goto('/feed');

  const card = page.getByTestId(`unified-munchie-card-${POST_ID}`);
  await expect(card).toBeVisible();
  await card.getByRole('button', { name: '게시물 메뉴' }).click();
  await card.getByRole('button', { name: '게시물 삭제' }).click();
  const dialog = page.getByRole('alertdialog');
  await expect(dialog).toContainText('원본 코스가 영구 삭제');
  await dialog.getByRole('button', { name: '확인' }).click();

  await expect(card).toHaveCount(0);
  expect(api.deleteRequests()).toBe(1);

  await page.reload();
  await expect(page.getByTestId(`unified-munchie-card-${POST_ID}`)).toHaveCount(0);
  const cachedIds = await page.evaluate(() => JSON.parse(localStorage.getItem('lm_feed_v3') ?? '[]').map((post: { id: string }) => post.id));
  expect(cachedIds).not.toContain(POST_ID);
});

test('feed detail centers its simplified header while owner actions remain in the card menu', async ({ page }) => {
  await mockFeedApi(page);
  await page.goto(`/feed/${POST_ID}`);

  const header = page.locator('main > header').filter({ hasText: 'Munchie Feed' });
  const main = header.locator('..');
  const card = page.getByTestId(`unified-munchie-card-${POST_ID}`);

  await expect(main).toBeVisible();
  await expect(header.getByRole('button', { name: '먼치피드로 돌아가기' })).toBeVisible();
  await expect(header.getByRole('button', { name: '피드 수정' })).toHaveCount(0);
  await expect(header.getByRole('button', { name: '피드 삭제' })).toHaveCount(0);

  const layout = await header.evaluate((element) => {
    const headerBox = element.getBoundingClientRect();
    const titleBox = element.querySelector('p')!.getBoundingClientRect();
    return {
      centerDelta: Math.abs((titleBox.left + titleBox.width / 2) - (headerBox.left + headerBox.width / 2)),
      mainWidth: element.parentElement!.getBoundingClientRect().width,
    };
  });
  expect(layout.centerDelta).toBeLessThanOrEqual(1);
  expect(layout.mainWidth).toBeLessThanOrEqual(430);

  await card.getByRole('button', { name: '게시물 메뉴' }).click();
  await expect(card.getByRole('button', { name: '게시물 수정' })).toBeVisible();
  await expect(card.getByRole('button', { name: '게시물 삭제' })).toBeVisible();
});
