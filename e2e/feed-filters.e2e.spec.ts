import { expect, test } from 'playwright/test';

test('feed page starts with filter options closed', async ({ page }) => {
  await page.route('**/api/auth/session', route => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({ user: null }),
  }));
  await page.route('**/api/feed**', route => route.fulfill({
    contentType: 'application/json',
    body: '[]',
  }));

  await page.goto('/feed');
  await expect(page.getByRole('button', { name: '사용자 검색 열기' })).toBeVisible();
  await expect(page.getByRole('button', { name: '필터 보기' })).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByText('근처 피드')).toHaveCount(0);

  await page.getByRole('button', { name: '필터 보기' }).click();
  await expect(page.getByRole('button', { name: '필터 보기' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText('근처 피드')).toBeVisible();

  await page.getByRole('button', { name: '필터 보기' }).click();
  await expect(page.getByRole('button', { name: '필터 보기' })).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByText('근처 피드')).toHaveCount(0);
});

test('feed waits for the canonical first page instead of flashing bundled demo posts', async ({ page }) => {
  const postId = 'post_canonical-first-page';
  let releaseFeed: (() => void) | undefined;
  const feedRequested = new Promise<void>(resolve => {
    releaseFeed = resolve;
  });

  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url());
    if (url.pathname === '/api/feed') {
      await feedRequested;
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          items: [{
            id: postId,
            courseId: 'course-canonical-first-page',
            creatorId: 'canonical-author',
            authorName: '정식 작성자',
            title: '정식 피드',
            description: 'D1에서 가져온 게시물',
            heroImage: '',
            photos: [],
            decor: [],
            templateId: null,
            tags: ['맛집'],
            stops: [],
            likesCount: 0,
            savesCount: 0,
            commentsCount: 0,
            comments: [],
            createdAt: new Date().toISOString(),
          }],
          nextCursor: null,
          hasMore: false,
        }),
      });
      return;
    }
    if (url.pathname === '/api/auth/session') {
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ user: null }) });
      return;
    }
    await route.fulfill({ contentType: 'application/json', body: '[]' });
  });

  await page.goto('/feed');
  await expect(page.locator('[data-testid^="unified-munchie-card-"]')).toHaveCount(0);

  releaseFeed?.();
  await expect(page.getByTestId(`unified-munchie-card-${postId}`)).toBeVisible();
  await expect(page.locator('[data-testid^="unified-munchie-card-"]')).toHaveCount(1);
});
