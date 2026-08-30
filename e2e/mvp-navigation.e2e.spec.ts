import { expect, test, type Page } from 'playwright/test';

async function mockDiscoveryApi(page: Page) {
  await page.route('**/api/auth/session', route => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({ user: null }),
  }));
  await page.route('**/api/feed**', route => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({ items: [], nextCursor: null, hasMore: false }),
  }));
  await page.route('**/api/restaurants**', route => route.fulfill({
    contentType: 'application/json',
    body: '[]',
  }));
  await page.route('**/api/courses**', route => route.fulfill({
    contentType: 'application/json',
    body: '[]',
  }));
}

test('Munchie MVP opens on discovery with a focused three-action navigation', async ({ page }) => {
  await mockDiscoveryApi(page);

  await page.goto('/');

  await expect(page).toHaveURL(/\/feed$/);
  await expect(page.getByRole('heading', { name: 'MUNCHIE FEED' })).toBeVisible();
  const navigation = page.getByRole('navigation', { name: '주요 메뉴' });
  await expect(navigation.getByRole('button', { name: '발견' })).toHaveAttribute('aria-current', 'page');
  await expect(navigation.getByRole('button', { name: '저장' })).toBeVisible();
  await expect(navigation.getByRole('button', { name: '게시' })).toHaveCount(0);
  await expect(navigation.getByRole('button', { name: '내 정보' })).toBeVisible();
  await expect(navigation.getByRole('button', { name: '홈' })).toHaveCount(0);
  await expect(navigation.getByRole('button', { name: '런치' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '새 Munchie 피드 작성' })).toHaveCount(0);
});

test('profile create action enters the existing Google auth boundary', async ({ page }) => {
  let authStartUrl = '';
  await mockDiscoveryApi(page);
  await page.route('**/api/auth/google/start**', async route => {
    authStartUrl = route.request().url();
    await route.fulfill({ contentType: 'text/html', body: '<h1>Google login boundary</h1>' });
  });

  await page.goto('/profile');
  await page.getByRole('button', { name: '로그인하고 게시물 작성' }).click();

  await expect(page.getByRole('heading', { name: 'Google login boundary' })).toBeVisible();
  expect(new URL(authStartUrl).searchParams.get('next')).toBe('/coursemap/new');
});

test('saved restaurants and multi-stop items share one course model', async ({ page }) => {
  await page.route('**/api/auth/session', route => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({
      user: { sub: 'saved-viewer', name: '저장 사용자', email: 'saved@example.com' },
      profile: { id: 'saved-viewer', username: '저장 사용자', handle: 'saved', profile_image_url: null },
    }),
  }));
  await page.route('**/api/feed**', route => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({ items: [], nextCursor: null, hasMore: false }),
  }));
  await page.route('**/api/restaurants**', route => route.fulfill({ contentType: 'application/json', body: '[]' }));
  await page.route('**/api/courses**', route => route.fulfill({ contentType: 'application/json', body: '[]' }));
  await page.route('**/api/journey**', route => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({ stops: [
      { restaurant_id: 'restaurant-1', name: '통합 식당', category: '한식', at: Date.now() },
    ] }),
  }));

  await page.goto('/saved?tab=restaurants');

  await expect(page.getByRole('heading', { name: '저장 🔖' })).toBeVisible();
  await expect(page.getByText('저장한 코스를 한곳에 모았어요 · 1개')).toBeVisible();
  await expect(page.getByRole('group', { name: '저장 항목 필터' })).toHaveCount(0);
  await expect(page.getByText('오늘의 런치픽 · 코스 1개')).toBeVisible();
  await expect(page.getByText('1곳 코스')).toBeVisible();
  await expect(page.getByRole('button', { name: /통합 식당.*1곳 코스.*한식/ })).toBeVisible();
  await expect(page.getByText('Munchie 먼치픽')).toHaveCount(0);
  await expect(page.getByText('Lunchie 런치픽')).toHaveCount(0);
});
