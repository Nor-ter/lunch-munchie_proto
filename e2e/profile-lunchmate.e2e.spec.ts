import { expect, test, type Page } from 'playwright/test';

async function requiredBox(locator: ReturnType<Page['locator']>) {
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  return box!;
}

const lunchmate = (skin: string) => ({
  visibility: 'public' as const,
  character: '🐥',
  skin,
  loadout: {
    outfit: 'outfit_hoodie_coral',
    headwear: null,
    eyewear: null,
    bag: null,
  },
  roomConfig: {
    wallpaperId: skin === 'blue-note' ? 'wallpaper_blue_note' : 'wallpaper_pink_blush',
    floorId: skin === 'blue-note' ? 'floor_light_wood' : 'floor_pale_wood',
    furnitureId: null,
    propsId: skin === 'blue-note' ? 'props_blue_note' : 'props_pink_picnic',
  },
});

async function mockBaseApis(page: Page, session: Record<string, unknown> | null = null) {
  await page.route('**/api/auth/session', route => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify(session ?? { user: null, profile: null }),
  }));
  await page.route('**/api/feed**', route => route.fulfill({
    contentType: 'application/json', body: JSON.stringify({ items: [], nextCursor: null }),
  }));
  await page.route('**/api/profile', route => route.fulfill({
    contentType: 'application/json', body: JSON.stringify({ profile: session?.profile ?? null }),
  }));
  await page.route('**/api/users/*/follows', route => route.fulfill({
    contentType: 'application/json', body: JSON.stringify({ followers: 0, following: 0 }),
  }));
  await page.route('**/api/users/*/follow', route => route.fulfill({
    contentType: 'application/json', body: JSON.stringify({ following: false }),
  }));
}

test('owner and visitor profiles share a centred mobile header', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await mockBaseApis(page, {
    user: { sub: 'owner-user', name: 'Owner' },
    profile: {
      id: 'owner-user', username: 'Owner', handle: 'owner_user', profile_image_url: null,
      lunchmate: lunchmate('pink-picnic'),
    },
  });

  await page.goto('/profile');
  const ownerTitle = page.getByRole('heading', { name: '프로필', exact: true });
  await expect(ownerTitle).toBeVisible();
  await expect(page.getByRole('button', { name: '프로필 설정' })).toBeVisible();
  const ownerBox = await ownerTitle.boundingBox();
  const ownerHero = page.locator('[data-profile-hero-card="owner"]');
  const ownerIdentity = ownerHero.locator('[data-profile-identity-summary="true"]');
  const ownerStageBox = await requiredBox(ownerHero.locator('[data-profile-lunchmate-stage="true"]'));
  const ownerHeroBox = await requiredBox(ownerHero);
  const ownerAvatarBox = await requiredBox(ownerIdentity.locator(':scope > div > :first-child'));
  const ownerNameBox = await requiredBox(page.getByText('Owner', { exact: true }));
  const ownerHandleBox = await requiredBox(ownerIdentity.getByTestId('profile-user-handle'));
  const ownerStatsBox = await requiredBox(ownerHero.locator(':scope > div').last());
  const ownerFeedTitleBox = await requiredBox(page.getByRole('heading', { name: '나의 피드 0' }));
  expect(ownerBox).not.toBeNull();
  expect(Math.abs((ownerBox!.x + ownerBox!.width / 2) - 180)).toBeLessThanOrEqual(1);

  await page.route('**/api/users/visitor-user', route => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({
      id: 'visitor-user', username: 'Visitor', handle: 'visitor_user', profile_image_url: null,
      bio: null, location: null, created_at: 1, lunchmate: lunchmate('blue-note'),
    }),
  }));
  await page.goto('/profile/visitor-user');
  const visitorTitle = page.getByRole('heading', { name: '프로필', exact: true });
  const visitorBox = await visitorTitle.boundingBox();
  expect(visitorBox).not.toBeNull();
  expect(Math.abs((visitorBox!.x + visitorBox!.width / 2) - 180)).toBeLessThanOrEqual(1);
  await expect(page.getByRole('button', { name: '뒤로 가기' })).toBeVisible();
  await expect(page.locator('[data-profile-hero-card="visitor"]')).toBeVisible();
  await expect(page.locator('[data-profile-hero-card="visitor"] [data-testid="public-lunchmate-room"]')).toBeVisible();
  const visitorHero = page.locator('[data-profile-hero-card="visitor"]');
  const visitorIdentity = visitorHero.locator('[data-profile-identity-summary="true"]');
  const visitorStageBox = await requiredBox(visitorHero.locator('[data-profile-lunchmate-stage="true"]'));
  const visitorHeroBox = await requiredBox(visitorHero);
  const visitorAvatarBox = await requiredBox(visitorIdentity.locator(':scope > div > :first-child'));
  const visitorNameBox = await requiredBox(page.getByText('Visitor', { exact: true }));
  const visitorHandleBox = await requiredBox(visitorIdentity.getByTestId('profile-user-handle'));
  const visitorStatsBox = await requiredBox(visitorHero.locator(':scope > div').last());
  const visitorFeedTitleBox = await requiredBox(page.getByRole('heading', { name: 'Visitor님의 피드' }));

  for (const [ownerValue, visitorValue] of [
    [ownerHeroBox.x, visitorHeroBox.x],
    [ownerHeroBox.width, visitorHeroBox.width],
    [ownerHeroBox.height, visitorHeroBox.height],
    [ownerStageBox.x, visitorStageBox.x],
    [ownerStageBox.y, visitorStageBox.y],
    [ownerStageBox.width, visitorStageBox.width],
    [ownerStageBox.height, visitorStageBox.height],
    [ownerAvatarBox.x, visitorAvatarBox.x],
    [ownerAvatarBox.y, visitorAvatarBox.y],
    [ownerAvatarBox.width, visitorAvatarBox.width],
    [ownerAvatarBox.height, visitorAvatarBox.height],
    [ownerNameBox.x, visitorNameBox.x],
    [ownerNameBox.y, visitorNameBox.y],
    [ownerHandleBox.x, visitorHandleBox.x],
    [ownerHandleBox.y, visitorHandleBox.y],
    [ownerStatsBox.y, visitorStatsBox.y],
    [ownerStatsBox.height, visitorStatsBox.height],
    [ownerFeedTitleBox.y, visitorFeedTitleBox.y],
  ]) {
    expect(Math.abs(ownerValue - visitorValue)).toBeLessThanOrEqual(1);
  }
});

test('anonymous visitor sees the viewed user public room without edit controls', async ({ page }) => {
  await mockBaseApis(page);
  const longDisplayName = 'Public User With A Very Long Display Name';
  await page.route('**/api/users/public-user', route => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({
      id: 'public-user', username: longDisplayName, handle: 'public_user', profile_image_url: null,
      bio: null, location: null, created_at: 1, lunchmate: lunchmate('blue-note'),
    }),
  }));

  await page.goto('/profile/public-user');
  await expect(page.getByTestId('public-lunchmate-room')).toBeVisible();
  await expect(page.locator('[data-profile-hero-card="visitor"]')).toContainText(longDisplayName);
  await expect(page.getByText('보기 전용')).toHaveCount(0);
  await expect(page.locator('[data-lunchmate-room-background="profile"]')).toBeVisible();
  await expect(page.locator('[data-lunchmate-artwork="chicken"]')).toBeVisible();
  const publicName = page.locator('[data-profile-display-name="true"]');
  const publicNameBox = await requiredBox(publicName);
  const handleBox = await requiredBox(page.getByTestId('profile-user-handle'));
  const followBox = await requiredBox(page.getByTestId('follow-button'));
  const nameOverflow = await publicName.evaluate(element => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
  }));
  expect(nameOverflow.scrollWidth).toBeGreaterThan(nameOverflow.clientWidth);
  expect(followBox.y).toBeGreaterThan(publicNameBox.y);
  expect(Math.abs(followBox.y - handleBox.y)).toBeLessThanOrEqual(1);
  await expect(
    page.getByRole('region', { name: '읽기 전용 런치메이트 룸' }).getByRole('button'),
  ).toHaveCount(0);

  await page.reload();
  await expect(page.getByText(longDisplayName, { exact: true })).toBeVisible();
  await expect(page.getByTestId('public-lunchmate-room')).toBeVisible();
});

test('private and missing Lunchmate profiles render safe states', async ({ page }) => {
  await mockBaseApis(page);
  await page.route('**/api/users/private-user', route => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({
      id: 'private-user', username: 'Private User', handle: 'private_user', profile_image_url: null,
      bio: null, location: null, created_at: 1,
      lunchmate: { visibility: 'private', character: null, skin: null, loadout: null, roomConfig: null },
    }),
  }));
  await page.route('**/api/users/empty-user', route => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({
      id: 'empty-user', username: 'Empty User', handle: 'empty_user', profile_image_url: null,
      bio: null, location: null, created_at: 1,
      lunchmate: { visibility: 'public', character: null, skin: null, loadout: null, roomConfig: null },
    }),
  }));

  await page.goto('/profile/private-user');
  await expect(page.getByText('이 사용자의 런치메이트 룸은 비공개예요.')).toBeVisible();
  await expect(page.getByTestId('public-lunchmate-room')).toHaveCount(0);

  await page.goto('/profile/empty-user');
  await expect(page.getByText('아직 공개된 런치메이트 룸이 없어요.')).toBeVisible();
  await expect(page.getByTestId('public-lunchmate-room')).toHaveCount(0);
});

test('switching from user B to C clears B before C loads', async ({ page }) => {
  await mockBaseApis(page);
  await page.route('**/api/users/user-b', route => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({
      id: 'user-b', username: 'User B', handle: 'user_b', profile_image_url: null,
      bio: null, location: null, created_at: 1, lunchmate: lunchmate('blue-note'),
    }),
  }));
  await page.route('**/api/users/user-c', async route => {
    await new Promise(resolve => setTimeout(resolve, 350));
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'user-c', username: 'User C', handle: 'user_c', profile_image_url: null,
        bio: null, location: null, created_at: 1, lunchmate: lunchmate('pink-picnic'),
      }),
    });
  });

  await page.goto('/profile/user-b');
  await expect(page.getByText('User B', { exact: true })).toBeVisible();
  await page.evaluate(() => {
    history.pushState({}, '', '/profile/user-c');
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
  await expect(page.getByText('프로필을 불러오는 중…')).toBeVisible();
  await expect(page.getByText('User B', { exact: true })).toHaveCount(0);
  await expect(page.getByTestId('public-lunchmate-room')).toHaveCount(0);
  await expect(page.getByText('User C', { exact: true })).toBeVisible();
  await expect(page.getByTestId('public-lunchmate-room')).toBeVisible();
});

test('returning from another profile preserves the Munchie Feed history entry', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await mockBaseApis(page);

  let feedRequests = 0;
  const feedItems = Array.from({ length: 12 }, (_, index) => ({
    id: `feed-${index}`,
    creatorId: 'feed-user',
    authorName: 'Feed User',
    authorImage: null,
    courseId: `course-${index}`,
    photos: [],
    description: `Feed item ${index}`,
    likesCount: 0,
    savesCount: 0,
    comments: [],
    tags: ['맛집'],
    stops: [],
    createdAt: Date.now() - index * 1_000,
  }));
  await page.route('**/api/feed**', route => {
    feedRequests += 1;
    return route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ items: feedItems, nextCursor: null, hasMore: false }),
    });
  });
  await page.route('**/api/users/feed-user', route => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({
      id: 'feed-user', username: 'Feed User', handle: 'feed_user', profile_image_url: null,
      bio: null, location: null, created_at: 1, lunchmate: lunchmate('blue-note'),
    }),
  }));

  await page.goto('/feed');
  const feedScroller = page.locator('[data-scroll-route="/feed"]');
  const filterToggle = page.getByRole('button', { name: '필터 보기' });
  const categoryFilter = page.getByRole('button', { name: '맛집', exact: true });
  await expect(page.locator('main article')).toHaveCount(12);
  await categoryFilter.click();
  await expect(categoryFilter).toHaveAttribute('aria-pressed', 'true');
  await filterToggle.click();
  await expect(filterToggle).toHaveAttribute('aria-pressed', 'false');

  await feedScroller.evaluate(element => element.scrollTo({ top: 1_200 }));
  const firstProfileLink = page.locator('main article').nth(4).getByRole('button', { name: 'Feed User', exact: true });
  await firstProfileLink.scrollIntoViewIfNeeded();
  const firstScrollTop = await feedScroller.evaluate(element => element.scrollTop);
  expect(firstScrollTop).toBeGreaterThan(500);
  const requestsBeforeFirstProfile = feedRequests;
  await firstProfileLink.click();
  await expect(page).toHaveURL('/profile/feed-user');

  await page.goBack();
  await expect(page).toHaveURL('/feed');
  await expect(filterToggle).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('main article')).toHaveCount(12);
  await expect.poll(() => feedScroller.evaluate(element => Math.round(element.scrollTop))).toBe(Math.round(firstScrollTop));
  expect(feedRequests).toBe(requestsBeforeFirstProfile);
  await filterToggle.click();
  await expect(categoryFilter).toHaveAttribute('aria-pressed', 'true');
  await filterToggle.click();
  await expect(filterToggle).toHaveAttribute('aria-pressed', 'false');

  await feedScroller.evaluate(element => element.scrollTo({ top: 1_600 }));
  const secondProfileLink = page.locator('main article').nth(6).getByRole('button', { name: 'Feed User', exact: true });
  await secondProfileLink.scrollIntoViewIfNeeded();
  const secondScrollTop = await feedScroller.evaluate(element => element.scrollTop);
  const requestsBeforeSecondProfile = feedRequests;
  await secondProfileLink.click();
  await expect(page).toHaveURL('/profile/feed-user');

  await page.getByRole('button', { name: '뒤로 가기' }).click();
  await expect(page).toHaveURL('/feed');
  await expect(filterToggle).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('main article')).toHaveCount(12);
  await expect.poll(() => feedScroller.evaluate(element => Math.round(element.scrollTop))).toBe(Math.round(secondScrollTop));
  expect(feedRequests).toBe(requestsBeforeSecondProfile);
  await filterToggle.click();
  await expect(categoryFilter).toHaveAttribute('aria-pressed', 'true');
});
