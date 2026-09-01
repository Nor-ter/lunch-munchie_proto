import { expect, test, type Locator, type Page } from 'playwright/test';

const VIEWER_ID = 'story-viewer';
const AUTHOR_ID = 'story-author';
const COURSE_ID = 'story-course';
const POST_ID = `post_${COURSE_ID}`;
const FIRST_PHOTO = `/photos/uploads/${AUTHOR_ID}/first.jpg`;
const SECOND_PHOTO = `/photos/uploads/${AUTHOR_ID}/second.jpg`;

const restaurants = [{
  id: 'restaurant-one',
  name: '첫 식당',
  category: '한식',
  photos: [],
  rating: 4.8,
  reviewCount: 10,
  priceLevel: 2,
  address: '서울 중구 1',
  description: '',
  tags: ['한식'],
  dietary: [],
  menuItems: [],
  phone: null,
  openHours: '',
  latitude: 37.5,
  longitude: 127,
}, {
  id: 'restaurant-two',
  name: '둘 식당',
  category: '카페',
  photos: [],
  rating: 4.7,
  reviewCount: 8,
  priceLevel: 2,
  address: '서울 중구 2',
  description: '',
  tags: ['카페'],
  dietary: [],
  menuItems: [],
  phone: null,
  openHours: '',
  latitude: 37.51,
  longitude: 127.01,
}];

const stops = restaurants.map((restaurant, index) => ({
  placeId: restaurant.id,
  order: index + 1,
  startTime: '',
  endTime: '',
  isBookmarked: false,
  restaurant,
}));

const course = {
  id: COURSE_ID,
  title: '오버레이 코스',
  description: '두 장의 기록',
  heroImage: FIRST_PHOTO,
  tags: ['맛집'],
  hashtags: [],
  region: '서울',
  metadata: { distance: 1.2, duration: 90, placeCount: 2 },
  creatorId: AUTHOR_ID,
  savedCount: 0,
  isPublic: true,
  createdAt: '2026-08-30T00:00:00.000Z',
  stops,
};

const post = {
  id: POST_ID,
  courseId: COURSE_ID,
  creatorId: AUTHOR_ID,
  authorName: '스토리 작성자',
  authorImage: null,
  title: course.title,
  description: course.description,
  heroImage: FIRST_PHOTO,
  photos: [FIRST_PHOTO, SECOND_PHOTO],
  decor: [
    { id: 'first-slide', src: FIRST_PHOTO, x: 50, y: 50, w: 100, h: 100, rotate: 0 },
    { id: 'second-slide', src: SECOND_PHOTO, x: 50, y: 50, w: 100, h: 100, rotate: 0 },
  ],
  storySlides: [{
    id: 'first-slide',
    photo: FIRST_PHOTO,
    overlays: [{
      id: 'first-food', kind: 'food_name', text: '첫 사진 비빔밥',
      x: 50, y: 78, width: 82, tone: 'dark', size: 'lg', align: 'left',
    }],
  }, {
    id: 'second-slide',
    photo: SECOND_PHOTO,
    overlays: [{
      id: 'second-review', kind: 'review', text: '둘째 사진만의 한줄평',
      x: 50, y: 85, width: 82, tone: 'accent', size: 'md', align: 'left',
    }],
  }],
  photoAttributions: [{
    r2Path: FIRST_PHOTO,
    classification: 'restaurant',
    restaurantId: 'restaurant-one',
    source: 'user_selected',
  }, {
    r2Path: SECOND_PHOTO,
    classification: 'restaurant',
    restaurantId: 'restaurant-two',
    source: 'user_selected',
  }],
  templateId: null,
  tags: ['맛집'],
  stops,
  likesCount: 0,
  savesCount: 0,
  commentsCount: 0,
  comments: [],
  createdAt: course.createdAt,
};

async function mockStoryApi(page: Page, options: { breakFirstPhoto?: boolean } = {}) {
  let likeRequests = 0;
  await page.route('**/photos/uploads/**', route => {
    const second = route.request().url().includes('second.jpg');
    if (options.breakFirstPhoto && !second) {
      return route.fulfill({ status: 404, contentType: 'text/plain', body: 'missing' });
    }
    return route.fulfill({
      contentType: 'image/svg+xml',
      body: `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="500"><rect width="400" height="500" fill="${second ? '#355c7d' : '#c06c84'}"/></svg>`,
    });
  });
  await page.route('**/api/**', async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.pathname === '/api/auth/session') {
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify({
        user: { sub: VIEWER_ID, name: '뷰어', email: 'viewer@example.com' },
        profile: { id: VIEWER_ID, username: '뷰어', handle: 'viewer', profile_image_url: null },
      }) });
      return;
    }
    if (url.pathname === '/api/feed-like') {
      likeRequests += 1;
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ liked: true, likesCount: 1 }) });
      return;
    }
    if (url.pathname === `/api/feed/${POST_ID}`) {
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ course, post }) });
      return;
    }
    if (url.pathname === '/api/feed') {
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify({
        items: [post], nextCursor: null, hasMore: false, policyVersion: 'feed-story-e2e-v1',
      }) });
      return;
    }
    if (url.pathname === `/api/users/${AUTHOR_ID}`) {
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify({
        id: AUTHOR_ID, username: '스토리 작성자', handle: 'story_author', profile_image_url: null,
        bio: null, location: null, created_at: 0, public_post_count: 1,
      }) });
      return;
    }
    if (url.pathname.startsWith(`/api/users/${AUTHOR_ID}/follow`)) {
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ following: false, followers: 0, followingCount: 0 }) });
      return;
    }
    if (url.pathname === '/api/courses') {
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify([course]) });
      return;
    }
    if (url.pathname === '/api/restaurants') {
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify(restaurants) });
      return;
    }
    await route.fulfill({ contentType: 'application/json', body: '{}' });
  });
  return { likeRequests: () => likeRequests };
}

async function dragLeft(page: Page, selector: Locator) {
  const box = await selector.boundingBox();
  expect(box).toBeTruthy();
  if (!box) return;
  await page.mouse.move(box.x + box.width * 0.75, box.y + box.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.25, box.y + box.height * 0.5, { steps: 5 });
  await page.mouse.up();
}

async function dragRight(page: Page, selector: Locator) {
  const box = await selector.boundingBox();
  expect(box).toBeTruthy();
  if (!box) return;
  await page.mouse.move(box.x + box.width * 0.25, box.y + box.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.75, box.y + box.height * 0.5, { steps: 5 });
  await page.mouse.up();
}

test('feed, profile, and detail render the same persisted per-photo story', async ({ page }) => {
  await mockStoryApi(page);
  for (const url of ['/feed', `/profile/${AUTHOR_ID}`, `/feed/${POST_ID}`]) {
    await page.goto(url);
    const card = page.getByTestId(`unified-munchie-card-${POST_ID}`);
    const carousel = url === `/feed/${POST_ID}`
      ? page.locator('[data-ui="feed-detail-story"] [data-ui="munchie-food-hero"]')
      : card.locator('[data-ui="munchie-food-hero"]');
    await expect(carousel).toHaveAttribute('tabindex', '0');
    await carousel.focus();
    await expect(carousel).toBeFocused();
    await expect(carousel).toHaveAttribute('data-slide-index', '0');
    await expect(carousel.locator('img')).toHaveAttribute('src', FIRST_PHOTO);
    await expect(carousel.getByText('첫 사진 비빔밥')).toBeVisible();

    await carousel.press('ArrowRight');
    await expect(carousel).toHaveAttribute('data-slide-index', '1');
    await expect(carousel.getByText('둘째 사진만의 한줄평')).toBeVisible();
    await carousel.press('ArrowLeft');
    await expect(carousel).toHaveAttribute('data-slide-index', '0');

    if (url === '/feed' || url.includes('/profile/')) {
      await expect(card.locator('button [data-ui="munchie-food-hero"]')).toHaveCount(0);
      await dragLeft(page, carousel);
    } else {
      await carousel.getByRole('button', { name: '다음 음식 사진' }).click();
    }
    await expect(carousel).toHaveAttribute('data-slide-index', '1');
    await expect(carousel.locator('img')).toHaveAttribute('src', SECOND_PHOTO);
    await expect(carousel.getByText('둘째 사진만의 한줄평')).toBeVisible();
  }
});

test('grid swipes change slides without becoming likes, while a stationary double tap likes once', async ({ page }) => {
  const api = await mockStoryApi(page);
  await page.goto('/feed');
  const card = page.getByTestId(`unified-munchie-card-${POST_ID}`);
  const carousel = card.locator('[data-ui="munchie-food-hero"]');

  await card.getByRole('button', { name: '다음 음식 사진' }).click();
  await expect(carousel).toHaveAttribute('data-slide-index', '1');
  expect(api.likeRequests()).toBe(0);
  await card.getByRole('button', { name: '이전 음식 사진' }).click();
  await expect(carousel).toHaveAttribute('data-slide-index', '0');

  await dragLeft(page, carousel);
  await expect(carousel).toHaveAttribute('data-slide-index', '1');
  await dragRight(page, carousel);
  await expect(carousel).toHaveAttribute('data-slide-index', '0');
  await dragLeft(page, carousel);
  await expect(carousel).toHaveAttribute('data-slide-index', '1');
  expect(api.likeRequests()).toBe(0);

  const interaction = card.locator('[data-ui="munchie-food-hero-interaction"]');
  const box = await interaction.boundingBox();
  expect(box).toBeTruthy();
  if (!box) return;
  const point = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  await page.mouse.click(point.x, point.y);
  await page.waitForTimeout(90);
  await page.mouse.click(point.x, point.y);
  await expect.poll(api.likeRequests).toBe(1);

  await page.waitForTimeout(350);
  await page.mouse.move(point.x, point.y);
  await page.mouse.down();
  await page.mouse.move(point.x + 10, point.y, { steps: 2 });
  await page.mouse.up();
  expect(api.likeRequests()).toBe(1);
});

test('a stationary grid tap opens the dedicated feed detail with story, copy, map, and directions', async ({ page }) => {
  await mockStoryApi(page);
  await page.goto('/feed');
  const card = page.getByTestId(`unified-munchie-card-${POST_ID}`);
  const carousel = card.locator('[data-ui="munchie-food-hero"]');

  await carousel.click({ position: { x: 90, y: 90 } });
  await expect(page).toHaveURL(`/feed/${POST_ID}?from=feed`);
  await expect(page.locator('[data-ui="feed-detail-story"]')).toBeVisible();
  await expect(page.locator('[data-ui="feed-detail-copy"]')).toContainText('오버레이 코스');
  await expect(page.locator('[data-ui="feed-detail-course-map"]')).toContainText('첫 식당');
  await expect(page.getByRole('link', { name: 'Google 지도에서 길찾기' })).toBeVisible();
});

test('compact profile swipe stays on the profile and the next ordinary tap opens detail', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await mockStoryApi(page);
  await page.goto(`/profile/${AUTHOR_ID}`);
  const card = page.getByTestId(`unified-munchie-card-${POST_ID}`);
  const carousel = card.locator('[data-ui="munchie-food-hero"]');
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await expect(card.locator('button [data-ui="munchie-food-hero"]')).toHaveCount(0);
  await dragLeft(page, carousel);
  await expect(carousel).toHaveAttribute('data-slide-index', '1');
  await expect(page).toHaveURL(new RegExp(`/profile/${AUTHOR_ID}$`));

  await page.waitForTimeout(20);
  await carousel.click();
  await expect(page).toHaveURL(new RegExp(`/feed/${POST_ID}`));
});

test('a broken slide stays explicit and can be left and revisited without photo substitution', async ({ page }) => {
  await mockStoryApi(page, { breakFirstPhoto: true });
  await page.goto('/feed');
  const card = page.getByTestId(`unified-munchie-card-${POST_ID}`);
  const carousel = card.locator('[data-ui="munchie-food-hero"]');

  await expect(carousel).toHaveAttribute('data-slide-index', '0');
  await expect(carousel).toHaveAttribute('data-state', 'empty');
  await expect(carousel.locator('img')).toHaveCount(0);
  const status = carousel.getByRole('status');
  await expect(status).toHaveAttribute('aria-live', 'polite');
  await expect(status).toHaveAttribute('aria-atomic', 'true');
  await expect(status).toContainText('이 음식 사진을 표시할 수 없어요');
  await expect(status).toContainText('다른 사진으로 자동 대체하지 않아요');

  await carousel.press('ArrowRight');
  await expect(carousel).toHaveAttribute('data-slide-index', '1');
  await expect(carousel).toHaveAttribute('data-state', 'photo');
  await expect(carousel.locator('img')).toHaveAttribute('src', SECOND_PHOTO);

  await carousel.press('ArrowLeft');
  await expect(carousel).toHaveAttribute('data-slide-index', '0');
  await expect(carousel).toHaveAttribute('data-state', 'empty');
  await expect(carousel.locator('img')).toHaveCount(0);
});
