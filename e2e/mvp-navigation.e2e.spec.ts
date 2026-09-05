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
  await expect(page.getByRole('button', { name: '사용자 검색 열기' })).toBeVisible();
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
  const restaurant = {
    id: 'restaurant-1', name: '통합 식당', category: '한식', photos: [],
    rating: 4.5, reviewCount: 20, priceLevel: 2, address: 'Melbourne VIC',
    description: '', tags: ['한식'], dietary: [], menuItems: [], phone: null,
    openHours: '', latitude: -37.81, longitude: 144.96,
  };
  const stop = {
    placeId: restaurant.id, order: 1, startTime: '', endTime: '',
    isBookmarked: false, restaurant,
  };
  const savedCourse = {
    id: 'saved-course-1', title: '오늘의 한 곳 코스', description: '통합 저장 테스트',
    heroImage: '', tags: ['맛집'], hashtags: [], region: 'Melbourne',
    metadata: { distance: 0, duration: 0, placeCount: 1 }, creatorId: 'course-author',
    savedCount: 1, isPublic: true, createdAt: new Date().toISOString(), stops: [stop],
  };
  const savedPost = {
    id: 'post_saved-course-1', courseId: savedCourse.id, creatorId: 'course-author',
    authorName: '코스 작성자', authorImage: null, title: savedCourse.title,
    description: savedCourse.description, heroImage: '', photos: [], decor: [],
    templateId: null, tags: savedCourse.tags, stops: [stop], likesCount: 0,
    savesCount: 1, commentsCount: 0, comments: [], createdAt: savedCourse.createdAt,
  };
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
  await page.route('**/api/saved-courses**', route => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({
      courseIds: [savedCourse.id],
      items: [{ courseId: savedCourse.id, savedAt: new Date().toISOString(), course: savedCourse, post: savedPost }],
    }),
  }));

  await page.goto('/saved?tab=restaurants');

  await expect(page.getByRole('textbox', { name: '저장 코스 검색' })).toBeVisible();
  await expect(page.getByRole('group', { name: '저장 항목 필터' })).toHaveCount(0);
  await expect(page.getByText('통합 식당')).toBeVisible();
  await expect(page.getByText('1곳 코스').first()).toBeVisible();
  await expect(page.getByText('Munchie 먼치픽')).toHaveCount(0);
  await expect(page.getByText('Lunchie 런치픽')).toHaveCount(0);

  await page.goto(`/course/${savedCourse.id}?from=saved&post=${savedPost.id}`);
  await page.getByRole('button', { name: '방문 일지 만들기' }).click();

  await expect(page).toHaveURL(/\/coursemap\/new\?course=saved-course-1$/);
  await expect(page.getByText('코스맵을 정하세요')).toBeVisible();
  await expect(page.getByText('통합 식당').first()).toBeVisible();
});
