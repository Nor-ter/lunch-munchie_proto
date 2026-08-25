import { expect, test, type Page } from 'playwright/test';

const userId = 'test-user';

function captureUnexpectedBrowserErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    // The app intentionally renders without Maps when the optional local web
    // key is absent; that global provider message is unrelated to Quick Match.
    if (
      message.type() === 'error' &&
      !message.text().startsWith('[MapProvider] VITE_GOOGLE_MAPS_API_KEY')
    ) errors.push(message.text());
  });
  return errors;
}

function cachedSession(overrides: Record<string, unknown> = {}) {
  return {
    id: 'session-e2e',
    name: 'E2E Quick Match',
    inviteCode: 'ABC123',
    hostId: userId,
    memberKey: 'e2e-member-key',
    members: [{ id: userId, name: 'Tester', emoji: '😊', hasVoted: false, preferences: [], ready: true }],
    filters: { partySize: 4, dietary: [], budget: 2, radius: 2000, categories: [] },
    deadline: null,
    deadlineMinutes: 10,
    status: 'waiting',
    restaurants: [],
    results: [],
    ...overrides,
  };
}

function serverSession(status = 'WAITING') {
  return {
    session: {
      id: 'session-e2e',
      host_user_id: userId,
      share_token: 'ABC123',
      group_size: 4,
      filter_distance: 2000,
      filter_budget: 2,
      filter_vibe: [],
      filter_dietary: [],
      deck_ids: [],
      status,
      deadline_at: status === 'WAITING' ? null : new Date(Date.now() + 600_000).toISOString(),
    },
    members: [{ user_id: userId, user_name: 'Tester', emoji: '😊', is_ready: true }],
  };
}

async function mockCommonApi(page: Page, sessionStatus = 'WAITING') {
  await page.route('https://fonts.googleapis.com/**', route => route.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  await page.route('https://cdn.jsdelivr.net/**', route => route.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url());
    if (url.pathname === '/api/auth/session') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ user: { sub: userId, name: 'Tester' }, profile: null }) });
      return;
    }
    if (url.pathname === '/api/restaurants' || url.pathname === '/api/courses' || url.pathname === '/api/feed') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
      return;
    }
    if (url.pathname === '/api/sessions/ABC123' && route.request().method() === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(serverSession(sessionStatus)) });
      return;
    }
    if (url.pathname === '/api/sessions/ABC123/cancel') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
}

async function seedIdentity(page: Page, session?: ReturnType<typeof cachedSession>) {
  await page.addInitScript(({ identity, activeSession }) => {
    localStorage.setItem('lm_last_auth_uid_v1', identity);
    localStorage.setItem('lm_profile', JSON.stringify({
      id: identity,
      name: 'Tester',
      emoji: '😊',
      dietary: [],
      categoryPrefs: [],
      totalSwipes: 0,
      totalLikes: 0,
      joinedAt: new Date().toISOString(),
    }));
    if (activeSession) localStorage.setItem('lm_session', JSON.stringify(activeSession));
    else localStorage.removeItem('lm_session');
  }, { identity: userId, activeSession: session ?? null });
}

test('mobile settings keeps the timer and vertical people wheel synchronized without horizontal overflow', async ({ page }) => {
  const browserErrors = captureUnexpectedBrowserErrors(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await mockCommonApi(page);
  await seedIdentity(page);
  await page.goto('/lunchie/settings');

  const deadline = page.getByRole('slider', { name: '마감 시간' });
  await expect(deadline).toHaveAttribute('aria-valuenow', '10');
  await deadline.focus();
  for (let step = 0; step < 5; step += 1) await page.keyboard.press('ArrowRight');
  await expect(deadline).toHaveAttribute('aria-valuenow', '15');
  await expect(page.getByRole('button', { name: '15 min' })).toHaveCount(0);
  await expect(page.getByText('Deadline', { exact: true })).toHaveCount(0);
  await expect(page.getByLabel('마감 분 직접 입력')).toHaveCount(0);

  const groupSize = page.getByRole('slider', { name: '인원 수' });
  const peopleCard = groupSize.locator('xpath=ancestor::section[1]');
  const [wheelBox, cardBox] = await Promise.all([groupSize.boundingBox(), peopleCard.boundingBox()]);
  expect(wheelBox!.width).toBeGreaterThan(cardBox!.width - 40);
  await groupSize.evaluate((element, itemHeight) => element.scrollTo({ top: itemHeight * 7 }), 48);
  await expect(groupSize).toHaveAttribute('aria-valuenow', '8');
  await groupSize.focus();
  await page.keyboard.press('ArrowDown');
  await expect(groupSize).toHaveAttribute('aria-valuenow', '9');
  await page.getByRole('button', { name: '30명 빠른 선택', exact: true }).click();
  await expect(groupSize).toHaveAttribute('aria-valuenow', '30');
  await expect(groupSize).toHaveAttribute('aria-valuetext', '30명');
  await page.getByRole('option', { name: '혼자', exact: true }).click();
  await expect(groupSize).toHaveAttribute('aria-valuenow', '1');
  await expect(groupSize).toHaveAttribute('aria-valuetext', '혼자');
  await expect(page.getByRole('button', { name: '같이', exact: true })).toHaveCount(0);

  const pescatarian = page.getByRole('button', { name: '🐟 Pescatarian', exact: true });
  await pescatarian.click();
  await expect(pescatarian).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: /Ingredients to avoid/ }).click();
  const nuts = page.getByRole('button', { name: '🥜 Nuts', exact: true });
  await nuts.click();
  await expect(nuts).toHaveAttribute('aria-pressed', 'true');
  const eggs = page.getByRole('button', { name: '🥚 Eggs', exact: true });
  await eggs.click();
  await expect(eggs).toHaveAttribute('aria-pressed', 'true');

  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  expect(browserErrors).toEqual([]);
});

test('solo start sends the new member credential and opens the restaurant deck', async ({ page }) => {
  const browserErrors = captureUnexpectedBrowserErrors(page);
  const memberKey = 'solo-member-key';
  let restaurantChoiceSwipeCount = 0;
  const restaurant = {
    id: 'restaurant-e2e',
    name: 'Solo Lunch Kitchen',
    category: '한식',
    tags: ['맛집'],
    rating: 4.8,
    reviewCount: 120,
    distance: '350m',
    address: 'Sydney',
    image: '',
    lat: -33.86,
    lng: 151.21,
    priceRange: 2,
    openHours: '11:00 - 21:00',
    dietary: [],
    description: 'A restaurant card for the solo flow.',
  };

  await page.setViewportSize({ width: 390, height: 844 });
  await page.route('https://fonts.googleapis.com/**', route => route.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  await page.route('https://cdn.jsdelivr.net/**', route => route.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  await page.route('**/api/**', async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.pathname === '/api/auth/session') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ user: { sub: userId, name: 'Tester' }, profile: null }) });
      return;
    }
    if (url.pathname === '/api/restaurants') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([restaurant]) });
      return;
    }
    if (url.pathname === '/api/courses' || url.pathname === '/api/feed') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
      return;
    }
    if (url.pathname === '/api/sessions/create') {
      const body = request.postDataJSON();
      expect(body.groupSize).toBe(1);
      expect(body.filterDietary).toEqual(expect.arrayContaining([
        'VEGETARIAN',
        'GLUTEN_FREE',
        'NO_DAIRY',
        'NO_EGGS',
        'NO_SEAFOOD',
      ]));
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ session: { id: 'solo-session' }, token: 'SOLO01', memberKey }),
      });
      return;
    }
    if (url.pathname === '/api/sessions/SOLO01/status') {
      const body = request.postDataJSON();
      expect(body).toMatchObject({ status: 'SWIPING_1', userId, memberKey });
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{"success":true}' });
      return;
    }
    if (url.pathname === '/api/sessions/SOLO01' && request.method() === 'GET') {
      const response = serverSession('SWIPING_1');
      response.session.id = 'solo-session';
      response.session.share_token = 'SOLO01';
      response.session.group_size = 1;
      response.session.deck_ids = [restaurant.id];
      response.session.filter_dietary = ['VEGETARIAN', 'GLUTEN_FREE', 'NO_DAIRY', 'NO_EGGS', 'NO_SEAFOOD'];
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(response) });
      return;
    }
    if (url.pathname === '/api/swipes') {
      const body = request.postDataJSON();
      if (body.restaurantId === restaurant.id && ['like', 'skip', 'LIKE', 'NOPE'].includes(body.action)) {
        restaurantChoiceSwipeCount += 1;
      }
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
  await seedIdentity(page);
  await page.goto('/lunchie/settings');

  await page.getByRole('option', { name: '혼자', exact: true }).click();
  await page.getByRole('button', { name: '🥬 Vegetarian', exact: true }).click();
  await page.getByRole('button', { name: '🌾 Gluten-free', exact: true }).click();
  await page.getByRole('button', { name: /Ingredients to avoid/ }).click();
  await page.getByRole('button', { name: '🥛 Dairy', exact: true }).click();
  await page.getByRole('button', { name: '🥚 Eggs', exact: true }).click();
  await page.getByRole('button', { name: '🐟 Seafood', exact: true }).click();
  await page.getByRole('button', { name: 'Swipe 시작하기' }).click();

  await expect(page).toHaveURL(/\/lunchie\/swipe$/);
  await expect(page.getByRole('heading', { name: restaurant.name })).toBeVisible();
  await expect(page.getByRole('note')).toContainText('Closest available matches');

  await expect(page.getByText('예선전 시작! 🍽️')).toHaveCount(0, { timeout: 5_000 });
  await page.getByRole('heading', { name: restaurant.name }).click();
  const detailsButton = page.getByRole('button', { name: `${restaurant.name} 식당 상세보기` });
  await expect(detailsButton).toBeVisible();

  await detailsButton.click();
  await expect(page.getByText(restaurant.address, { exact: true })).toBeVisible();
  await expect(page.getByText(restaurant.openHours, { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '뒤로가기' }).click();
  await expect(page.getByText(restaurant.address, { exact: true })).toHaveCount(0);
  await expect(detailsButton).toBeVisible();

  await detailsButton.click();
  await expect(page.getByText(restaurant.address, { exact: true })).toBeVisible();
  await page.evaluate(() => window.history.back());
  await expect(page.getByText(restaurant.address, { exact: true })).toHaveCount(0);
  await expect(detailsButton).toBeVisible();
  await expect(page.getByRole('heading', { name: restaurant.name })).toBeVisible();
  expect(restaurantChoiceSwipeCount).toBe(0);
  expect(browserErrors).toEqual([]);
});

test('desktop settings verifies the active session and cancels it through the shared menu', async ({ page }) => {
  const browserErrors = captureUnexpectedBrowserErrors(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  await mockCommonApi(page);
  await seedIdentity(page, cachedSession());
  await page.goto('/lunchie/settings');

  await expect(page.getByRole('region', { name: 'Quick Match in progress' })).toBeVisible();
  await expect(page.getByText('👥 1/4 people', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '대기방으로 돌아가기' })).toBeVisible();
  await page.getByRole('button', { name: 'Quick Match management' }).click();
  await page.getByRole('menuitem', { name: 'Cancel Quick Match' }).click();
  await expect(page.getByRole('alertdialog')).toBeVisible();
  await page.getByRole('button', { name: 'Cancel Quick Match' }).click();
  await expect(page.getByRole('region', { name: 'Quick Match in progress' })).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem('lm_session'))).toBeNull();
  expect(browserErrors).toEqual([]);
});

test('choosing solo replaces an active group room instead of resuming its two-person gate', async ({ page }) => {
  const browserErrors = captureUnexpectedBrowserErrors(page);
  const restaurant = {
    id: 'replacement-restaurant',
    name: 'Solo Replacement Kitchen',
    category: '한식',
    tags: ['맛집'],
    rating: 4.7,
    reviewCount: 42,
    distance: '450m',
    address: 'Melbourne',
    image: '',
    lat: -37.81,
    lng: 144.96,
    priceRange: 2,
    openHours: '11:00 - 21:00',
    dietary: [],
    description: 'A restaurant card for replacement-session coverage.',
  };
  let cancelCount = 0;
  let createCount = 0;

  await page.setViewportSize({ width: 390, height: 844 });
  await page.route('https://fonts.googleapis.com/**', route => route.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  await page.route('https://cdn.jsdelivr.net/**', route => route.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  await page.route('**/api/**', async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.pathname === '/api/auth/session') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ user: { sub: userId, name: 'Tester' }, profile: null }) });
      return;
    }
    if (url.pathname === '/api/restaurants') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([restaurant]) });
      return;
    }
    if (url.pathname === '/api/courses' || url.pathname === '/api/feed') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
      return;
    }
    if (url.pathname === '/api/sessions/ABC123' && request.method() === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(serverSession('WAITING')) });
      return;
    }
    if (url.pathname === '/api/sessions/ABC123/cancel') {
      cancelCount += 1;
      expect(request.postDataJSON()).toMatchObject({ userId, memberKey: 'e2e-member-key' });
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
      return;
    }
    if (url.pathname === '/api/sessions/create') {
      createCount += 1;
      expect(request.postDataJSON()).toMatchObject({ groupSize: 1 });
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ session: { id: 'replacement-solo' }, token: 'SOLO02', memberKey: 'replacement-member-key' }),
      });
      return;
    }
    if (url.pathname === '/api/sessions/SOLO02/status') {
      expect(request.postDataJSON()).toMatchObject({
        status: 'SWIPING_1',
        userId,
        memberKey: 'replacement-member-key',
      });
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
      return;
    }
    if (url.pathname === '/api/sessions/SOLO02' && request.method() === 'GET') {
      const response = serverSession('SWIPING_1');
      response.session.id = 'replacement-solo';
      response.session.share_token = 'SOLO02';
      response.session.group_size = 1;
      response.session.deck_ids = [restaurant.id];
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(response) });
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
  await seedIdentity(page, cachedSession());
  await page.goto('/lunchie/settings');

  await expect(page.getByRole('region', { name: 'Quick Match in progress' })).toBeVisible();
  await page.getByRole('option', { name: '혼자', exact: true }).click();
  await page.getByRole('button', { name: '기존 세션 종료 후 혼자로 시작하기' }).click();

  const confirmation = page.getByRole('alertdialog');
  await expect(confirmation).toContainText('현재 4명 세션이 진행 중이에요.');
  expect(cancelCount).toBe(0);
  expect(createCount).toBe(0);
  await confirmation.getByRole('button', { name: '종료 후 새로 시작' }).click();

  await expect(page).toHaveURL(/\/lunchie\/swipe$/);
  await expect(page.getByRole('heading', { name: restaurant.name })).toBeVisible();
  expect(cancelCount).toBe(1);
  expect(createCount).toBe(1);
  expect(browserErrors).toEqual([]);
});

test('swipe shows an explicit empty-catalogue state for a restored active session', async ({ page }) => {
  const browserErrors = captureUnexpectedBrowserErrors(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await mockCommonApi(page, 'SWIPING_1');
  await seedIdentity(page, cachedSession({ status: 'voting' }));
  await page.goto('/lunchie/swipe');
  await expect(page.getByRole('heading', { name: 'Restaurants aren’t available yet' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  expect(browserErrors).toEqual([]);
});
