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

  const deadline = page.getByRole('slider', { name: 'Time limit' });
  await expect(deadline).toHaveAttribute('aria-valuenow', '10');
  await deadline.focus();
  for (let step = 0; step < 5; step += 1) await page.keyboard.press('ArrowRight');
  await expect(deadline).toHaveAttribute('aria-valuenow', '15');
  await expect(page.getByRole('button', { name: '15 min' })).toHaveCount(0);
  await expect(page.getByText('Deadline', { exact: true })).toHaveCount(0);
  await expect(page.getByLabel('Time limit min 직접 입력')).toHaveCount(0);

  const groupSize = page.getByRole('slider', { name: 'Group size' });
  const peopleCard = groupSize.locator('xpath=ancestor::section[1]');
  const [wheelBox, cardBox] = await Promise.all([groupSize.boundingBox(), peopleCard.boundingBox()]);
  expect(wheelBox!.width).toBeGreaterThan(cardBox!.width - 40);
  await groupSize.evaluate((element, itemHeight) => element.scrollTo({ top: itemHeight * 7 }), 48);
  await expect(groupSize).toHaveAttribute('aria-valuenow', '8');
  await groupSize.focus();
  await page.keyboard.press('ArrowDown');
  await expect(groupSize).toHaveAttribute('aria-valuenow', '9');
  await page.getByRole('button', { name: 'Choose 30 people', exact: true }).click();
  await expect(groupSize).toHaveAttribute('aria-valuenow', '30');
  await expect(groupSize).toHaveAttribute('aria-valuetext', '30 people');
  await page.getByRole('option', { name: '1 person', exact: true }).click();
  await expect(groupSize).toHaveAttribute('aria-valuenow', '1');
  await expect(groupSize).toHaveAttribute('aria-valuetext', '1 person');
  await expect(page.getByRole('button', { name: 'Together', exact: true })).toHaveCount(0);

  await page.getByRole('button', { name: /Dietary needs/ }).click();
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

  const dietPanel = page.locator('#quick-match-dietary-options');
  const avoidancePanel = page.locator('#quick-match-ingredient-avoidance-options');
  await dietPanel.getByRole('button', { name: 'Reset choices' }).click();
  await expect(pescatarian).toHaveAttribute('aria-pressed', 'false');
  await expect(nuts).toHaveAttribute('aria-pressed', 'true');
  await pescatarian.click();
  await avoidancePanel.getByRole('button', { name: 'Reset choices' }).click();
  await expect(nuts).toHaveAttribute('aria-pressed', 'false');
  await expect(eggs).toHaveAttribute('aria-pressed', 'false');
  await expect(pescatarian).toHaveAttribute('aria-pressed', 'true');
  await nuts.click();
  await page.reload();
  await expect(page.getByRole('button', { name: /Dietary needs/ })).toHaveAttribute('aria-expanded', 'false');
  await page.getByRole('button', { name: /Dietary needs/ }).click();
  await page.getByRole('button', { name: /Ingredients to avoid/ }).click();
  await expect(pescatarian).toHaveAttribute('aria-pressed', 'true');
  await expect(nuts).toHaveAttribute('aria-pressed', 'true');

  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  expect(browserErrors).toEqual([]);
});

test('participant lobby removes the retired logo and normalizes legacy member avatars', async ({ page }) => {
  const browserErrors = captureUnexpectedBrowserErrors(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route('https://fonts.googleapis.com/**', route => route.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  await page.route('https://cdn.jsdelivr.net/**', route => route.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url());
    if (url.pathname === '/api/auth/session') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: { sub: userId, name: 'Tester' },
          profile: { username: 'Tester', profile_image_url: '/assets/Logo%20003%203.png' },
        }),
      });
      return;
    }
    if (url.pathname === '/api/restaurants' || url.pathname === '/api/courses' || url.pathname === '/api/feed') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
      return;
    }
    if (url.pathname === '/api/sessions/ABC123') {
      const response = serverSession();
      response.session.host_user_id = 'host-user';
      response.members = [
        { user_id: 'host-user', user_name: 'Host', emoji: '/assets/Logo%20003%203.png', is_ready: true },
        { user_id: userId, user_name: 'Tester', emoji: '🍜', is_ready: true },
      ];
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(response) });
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
  await seedIdentity(page, cachedSession({
    hostId: 'host-user',
    members: [
      { id: 'host-user', name: 'Host', emoji: '/assets/Logo%20003%203.png', hasVoted: false, preferences: [], ready: true },
      { id: userId, name: 'Tester', emoji: '🍜', hasVoted: false, preferences: [], ready: true },
    ],
  }));

  await page.goto('/session/lobby');

  await expect(page.getByRole('heading', { name: 'You\'re in!' })).toBeVisible();
  await expect(page.getByLabel('2 people')).toContainText('😊🍜');
  await expect(page.locator('header')).toHaveCount(0);
  await expect(page.locator('main img[src="/assets/Logo%20003%203.png"]')).toHaveCount(0);
  await expect(page.locator('.tab-bar img[src="/assets/Logo%20003%203.png"]')).toHaveCount(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  expect(browserErrors).toEqual([]);
});

test('waiting companion stays visible when results arrive and returns to the result flow', async ({ page }) => {
  const browserErrors = captureUnexpectedBrowserErrors(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route('https://fonts.googleapis.com/**', route => route.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  await page.route('https://cdn.jsdelivr.net/**', route => route.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url());
    if (url.pathname === '/api/auth/session') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ user: { sub: userId, name: 'Tester' }, profile: null }) });
      return;
    }
    if (url.pathname === '/api/sessions/ABC123/results') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          phase: 'DONE',
          deadlineAt: null,
          memberCompletion: [{ id: userId, completed: true }],
          winnerId: 'winner-e2e',
        }),
      });
      return;
    }
    if (url.pathname === '/api/sessions/ABC123') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(serverSession('SWIPING_1')) });
      return;
    }
    if (url.pathname === '/api/restaurants' || url.pathname === '/api/courses' || url.pathname === '/api/feed') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
  await seedIdentity(page, cachedSession({ status: 'voting' }));
  await page.addInitScript(() => localStorage.setItem('lm_lunchie_waiting_companion_session', 'session-e2e'));

  await page.goto('/feed');

  const resultButton = page.getByRole('button', { name: /Your winner is ready/ });
  await expect(resultButton).toBeVisible();
  await expect(page.getByRole('button', { name: 'Play with Lunchiken while you wait' })).toBeVisible();
  await resultButton.click({ force: true });
  await expect(page).toHaveURL(/\/lunchie\/swipe$/);
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
    if (url.pathname === `/api/restaurants/${restaurant.id}`) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(restaurant) });
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

  await page.getByRole('option', { name: '1 person', exact: true }).click();
  await page.getByRole('button', { name: /Dietary needs/ }).click();
  await page.getByRole('button', { name: '🥬 Vegetarian', exact: true }).click();
  await page.getByRole('button', { name: '🌾 Gluten-free', exact: true }).click();
  await page.getByRole('button', { name: /Ingredients to avoid/ }).click();
  await page.getByRole('button', { name: '🥛 Dairy', exact: true }).click();
  await page.getByRole('button', { name: '🥚 Eggs', exact: true }).click();
  await page.getByRole('button', { name: '🐟 Seafood', exact: true }).click();
  await page.getByRole('button', { name: "Find restaurants" }).click();

  await expect(page).toHaveURL(/\/lunchie\/swipe$/);
  const loadingIntro = page.getByRole('status', { name: "Finding restaurants" });
  await expect(loadingIntro).toBeVisible();
  await expect(loadingIntro.getByRole('img', { name: 'Lunchiken preparing Quick Match' })).toBeVisible();
  await expect(loadingIntro.getByText("Something tasty is on the way", { exact: true })).toBeVisible();
  await expect(loadingIntro.getByRole('button')).toHaveCount(0);
  await expect(loadingIntro.getByText(/NOPE|LIKE|Dislike|Like/)).toHaveCount(0);
  await expect(page.getByRole('heading', { name: restaurant.name })).toBeVisible();
  await expect(page.getByRole('note')).toContainText("Closest to you");

  // 시작 오버레이 문구에 의존하지 않는다. 문구가 바뀌면 대기가 조용히 무력화되므로,
  // 오버레이가 걷힐 때까지는 Playwright의 actionability 재시도에 맡긴다.
  await page.getByRole('heading', { name: restaurant.name }).click();
  const detailsButton = page.getByRole('button', { name: `About ${restaurant.name}` });
  await expect(detailsButton).toBeVisible();

  await detailsButton.click();
  await expect(page.getByText(restaurant.address, { exact: true })).toBeVisible();
  await expect(page.getByText(restaurant.openHours, { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Close details', exact: true }).last().click();
  await expect(page.getByText(restaurant.address, { exact: true })).toHaveCount(0);
  await expect(detailsButton).toBeVisible();

  await detailsButton.click();
  await expect(page.getByText(restaurant.address, { exact: true })).toBeVisible();
  await page.evaluate(() => window.history.back());
  await expect(page.getByText(restaurant.address, { exact: true })).toHaveCount(0);
  await expect(detailsButton).toBeVisible();
  await expect(page.getByRole('heading', { name: restaurant.name })).toBeVisible();
  expect(restaurantChoiceSwipeCount).toBe(0);

  await page.getByRole('button', { name: 'Back to Quick Match settings' }).click();
  await expect(page).toHaveURL(/\/lunchie\/settings$/);
  await expect(page.getByRole('region', { name: "Your current Quick Match" })).toBeVisible();
  await page.waitForTimeout(1_200);
  await expect(page).toHaveURL(/\/lunchie\/settings$/);
  expect(browserErrors).toEqual([]);
});

test('restaurant progress stays separate from menu photo progress', async ({ page }) => {
  const restaurants = [
    {
      id: 'restaurant-progress-1',
      name: 'Progress Kitchen',
      category: 'Korean',
      tags: ['Lunch'],
      rating: 4.8,
      reviewCount: 120,
      distance: '350m',
      address: 'Sydney',
      image: '/assets/lunchmate/1x/lunchmate_default.png',
      photos: [
        '/assets/lunchmate/1x/lunchmate_default.png',
        '/assets/lunchmate/1x/lunchmate_happy.png',
        '/assets/lunchmate/1x/lunchmate_eating.png',
      ],
      lat: -33.86,
      lng: 151.21,
      priceRange: 2,
      openHours: '11:00 - 21:00',
      dietary: [],
      description: 'A restaurant with multiple menu photos.',
    },
    {
      id: 'restaurant-progress-2',
      name: 'Second Kitchen',
      category: 'Japanese',
      tags: ['Dinner'],
      rating: 4.7,
      reviewCount: 85,
      distance: '600m',
      address: 'Sydney',
      image: '/assets/lunchmate/1x/lunchmate_excited.png',
      photos: ['/assets/lunchmate/1x/lunchmate_excited.png'],
      lat: -33.87,
      lng: 151.2,
      priceRange: 2,
      openHours: '11:30 - 22:00',
      dietary: [],
      description: 'The second restaurant card.',
    },
  ];

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
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(restaurants) });
      return;
    }
    if (url.pathname === '/api/courses' || url.pathname === '/api/feed') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
      return;
    }
    if (url.pathname === '/api/sessions/ABC123' && request.method() === 'GET') {
      const response = serverSession('SWIPING_1');
      response.session.deck_ids = restaurants.map(restaurant => restaurant.id);
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(response) });
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
  });
  await seedIdentity(page, cachedSession({ status: 'voting', restaurants }));
  await page.goto('/lunchie/swipe');

  const firstRestaurantProgress = page.getByRole('status', { name: 'Restaurant 1 of 2' });
  await expect(firstRestaurantProgress).toHaveText('1 / 2');
  await expect(page.getByText("See anything you like?", { exact: true })).toBeVisible();
  await expect(page.getByText("See anything you like? · 1/2", { exact: true })).toHaveCount(0);

  await expect(page.getByText('예선전 시작! 🍽️', { exact: true })).toHaveCount(0, { timeout: 4_000 });
  await page.getByRole('heading', { name: restaurants[0].name }).click();
  await expect(page.getByRole('status', { name: 'Photo 1 of 3' })).toHaveText('Photo 1 / 3');

  await page.getByRole('button', { name: 'Next photo' }).click();
  await expect(page.getByRole('status', { name: 'Photo 2 of 3' })).toHaveText('Photo 2 / 3');

  await page.getByRole('button', { name: 'Close menu' }).click();
  await expect(firstRestaurantProgress).toHaveText('1 / 2');

  await page.getByRole('button', { name: 'Dislike' }).click();
  await expect(page.getByRole('status', { name: 'Restaurant 2 of 2' })).toHaveText('2 / 2');
});

test('desktop settings verifies the active session and cancels it through the shared menu', async ({ page }) => {
  const browserErrors = captureUnexpectedBrowserErrors(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  await mockCommonApi(page);
  await seedIdentity(page, cachedSession());
  await page.goto('/lunchie/settings');

  const activeSessionRegion = page.getByRole('region', { name: "Your current Quick Match" });
  await expect(activeSessionRegion).toBeVisible();
  await expect(page.getByText('👥 1 of 4 joined', { exact: true })).toBeVisible();
  await expect(activeSessionRegion.getByRole('button', { name: 'Back to lobby' })).toBeVisible();
  await page.getByRole('button', { name: 'Manage Quick Match' }).click();
  await page.getByRole('menuitem', { name: 'Cancel Quick Match' }).click();
  await expect(page.getByRole('alertdialog')).toBeVisible();
  await page.getByRole('button', { name: 'Cancel Quick Match' }).click();
  await expect(page.getByRole('region', { name: "Your current Quick Match" })).toHaveCount(0);
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

  await expect(page.getByRole('region', { name: "Your current Quick Match" })).toBeVisible();
  await page.getByRole('option', { name: '1 person', exact: true }).click();
  await page.getByRole('button', { name: 'Start new match' }).click();

  const confirmation = page.getByRole('alertdialog');
  await expect(confirmation).toContainText('This match is for 4 people.');
  expect(cancelCount).toBe(0);
  expect(createCount).toBe(0);
  await confirmation.getByRole('button', { name: 'End and start fresh' }).click();

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
  await expect(page.getByRole('heading', { name: "No restaurants to show" })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  expect(browserErrors).toEqual([]);
});

test('rapid menu-photo taps do not stack cube rotations', async ({ page }) => {
  const browserErrors = captureUnexpectedBrowserErrors(page);
  const photo = (label: string, color: string) =>
    `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="480" height="480"><rect width="100%" height="100%" fill="${color}"/><text x="50%" y="50%" text-anchor="middle" fill="white" font-size="64">${label}</text></svg>`)}`;
  const restaurant = {
    id: 'rotation-e2e',
    name: 'Rotation Kitchen',
    category: '한식',
    tags: ['맛집'],
    rating: 4.7,
    reviewCount: 18,
    distance: '250m',
    address: 'Melbourne',
    image: '',
    photos: [photo('ONE', '#E85053'), photo('TWO', '#F39B45'), photo('THREE', '#4DAE76')],
    menuItems: [],
    lat: -37.81,
    lng: 144.96,
    priceRange: 2,
    openHours: 'Monday: 11:00–21:00\nTuesday: 11:00–21:00',
    phone: '+61 3 9000 0000',
    dietary: [],
    description: 'A long neighbourhood restaurant description sourced from the canonical database for the expandable Quick Match detail preview.',
  };

  await page.setViewportSize({ width: 390, height: 844 });
  await page.route('https://fonts.googleapis.com/**', route => route.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  await page.route('https://cdn.jsdelivr.net/**', route => route.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url());
    if (url.pathname === '/api/auth/session') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ user: { sub: userId, name: 'Tester' }, profile: null }) });
      return;
    }
    if (url.pathname === '/api/restaurants') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([restaurant]) });
      return;
    }
    if (url.pathname === `/api/restaurants/${restaurant.id}`) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ...restaurant,
          review_count: restaurant.reviewCount,
          price_level: restaurant.priceRange,
          business_hours: restaurant.openHours,
          phone_number: restaurant.phone,
          short_description: restaurant.description,
          latitude: restaurant.lat,
          longitude: restaurant.lng,
          menu_items: [],
          dietary_options: [],
        }),
      });
      return;
    }
    if (url.pathname === '/api/courses' || url.pathname === '/api/feed') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
      return;
    }
    if (url.pathname === '/api/sessions/ABC123' && route.request().method() === 'GET') {
      const response = serverSession('SWIPING_1');
      response.session.deck_ids = [restaurant.id];
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(response) });
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
  await seedIdentity(page, cachedSession({ status: 'voting', restaurants: [restaurant] }));
  await page.goto('/lunchie/swipe');

  const detailPreview = page.getByRole('button', { name: `View details for ${restaurant.name}` });
  await expect(detailPreview).toBeVisible();
  await expect(detailPreview.getByText('Details ›', { exact: true })).toBeVisible();
  expect((await detailPreview.boundingBox())!.height).toBeGreaterThanOrEqual(32);
  await detailPreview.click();
  const detailSheet = page.getByRole('dialog', { name: `${restaurant.name} Details` });
  await expect(detailSheet).toBeVisible();
  await expect(detailSheet.getByText(restaurant.description, { exact: true })).toBeVisible();
  await expect(detailSheet.getByText(restaurant.address, { exact: true })).toBeVisible();
  await expect(detailSheet.getByText(restaurant.phone, { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Close details', exact: true }).click();
  await expect(detailSheet).toHaveCount(0);

  await page.getByRole('heading', { name: restaurant.name }).click();
  const nextPhoto = page.getByRole('button', { name: 'Next photo' });
  await expect(nextPhoto).toBeVisible();
  await expect(page.getByText(/^Menu \d+$/, { exact: true })).toHaveCount(0);
  const photoProgress = page.locator('[data-ui="menu-photo-progress"]');
  await expect(photoProgress).toHaveAttribute('aria-hidden', 'true');
  await expect(photoProgress).toHaveAttribute('data-photo-count', '3');
  await expect(photoProgress).toHaveAttribute('data-photo-index', '1');

  await nextPhoto.evaluate((button: HTMLButtonElement) => {
    for (let tap = 0; tap < 6; tap += 1) button.click();
  });

  await expect(photoProgress).toHaveAttribute('data-photo-index', '2');
  await expect(nextPhoto).toBeDisabled();
  await expect(nextPhoto).toBeEnabled({ timeout: 2_000 });
  await nextPhoto.click();
  await expect(photoProgress).toHaveAttribute('data-photo-index', '3');
  expect(browserErrors).toEqual([]);
});
