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

  const pescatarian = page.getByRole('button', { name: '🐟 페스코 채식', exact: true });
  await pescatarian.click();
  await expect(pescatarian).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: /피하고 싶은 재료/ }).click();
  const nuts = page.getByRole('button', { name: '🥜 견과류', exact: true });
  await nuts.click();
  await expect(nuts).toHaveAttribute('aria-pressed', 'true');
  const eggs = page.getByRole('button', { name: '🥚 달걀', exact: true });
  await eggs.click();
  await expect(eggs).toHaveAttribute('aria-pressed', 'true');

  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  expect(browserErrors).toEqual([]);
});

test('solo start sends the new member credential and opens the restaurant deck', async ({ page }) => {
  const browserErrors = captureUnexpectedBrowserErrors(page);
  const memberKey = 'solo-member-key';
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
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
  await seedIdentity(page);
  await page.goto('/lunchie/settings');

  await page.getByRole('option', { name: '혼자', exact: true }).click();
  await page.getByRole('button', { name: '🥬 채식', exact: true }).click();
  await page.getByRole('button', { name: '🌾 글루텐 프리', exact: true }).click();
  await page.getByRole('button', { name: /피하고 싶은 재료/ }).click();
  await page.getByRole('button', { name: '🥛 유제품', exact: true }).click();
  await page.getByRole('button', { name: '🥚 달걀', exact: true }).click();
  await page.getByRole('button', { name: '🐟 해산물', exact: true }).click();
  await page.getByRole('button', { name: '카드 선택 시작하기' }).click();

  await expect(page).toHaveURL(/\/lunchie\/swipe$/);
  await expect(page.getByRole('heading', { name: restaurant.name })).toBeVisible();
  await expect(page.getByRole('note')).toContainText('현재 위치에서 가장 가까운 후보');

  await page.getByRole('button', { name: '빠른 매칭 설정으로 돌아가기' }).click();
  await expect(page).toHaveURL(/\/lunchie\/settings$/);
  await expect(page.getByRole('region', { name: '진행 중인 빠른 매칭' })).toBeVisible();
  await page.waitForTimeout(1_200);
  await expect(page).toHaveURL(/\/lunchie\/settings$/);
  expect(browserErrors).toEqual([]);
});

test('desktop settings verifies the active session and cancels it through the shared menu', async ({ page }) => {
  const browserErrors = captureUnexpectedBrowserErrors(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  await mockCommonApi(page);
  await seedIdentity(page, cachedSession());
  await page.goto('/lunchie/settings');

  await expect(page.getByRole('region', { name: '진행 중인 빠른 매칭' })).toBeVisible();
  await expect(page.getByText('👥 1/4명', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '빠른 매칭 관리' }).click();
  await page.getByRole('menuitem', { name: '빠른 매칭 취소' }).click();
  await expect(page.getByRole('alertdialog')).toBeVisible();
  await page.getByRole('button', { name: '빠른 매칭 취소' }).click();
  await expect(page.getByRole('region', { name: '진행 중인 빠른 매칭' })).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem('lm_session'))).toBeNull();
  expect(browserErrors).toEqual([]);
});

test('swipe shows an explicit empty-catalogue state for a restored active session', async ({ page }) => {
  const browserErrors = captureUnexpectedBrowserErrors(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await mockCommonApi(page, 'SWIPING_1');
  await seedIdentity(page, cachedSession({ status: 'voting' }));
  await page.goto('/lunchie/swipe');
  await expect(page.getByRole('heading', { name: '아직 추천할 식당이 없어요' })).toBeVisible();
  await expect(page.getByRole('button', { name: '다시 시도' })).toBeVisible();
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

  const detailPreview = page.getByRole('button', { name: `${restaurant.name} 상세정보 보기` });
  await expect(detailPreview).toBeVisible();
  expect((await detailPreview.boundingBox())!.height).toBeLessThanOrEqual(20);
  await detailPreview.click();
  const detailSheet = page.getByRole('dialog', { name: `${restaurant.name} 상세정보` });
  await expect(detailSheet).toBeVisible();
  await expect(detailSheet.getByText(restaurant.description, { exact: true })).toBeVisible();
  await expect(detailSheet.getByText(restaurant.address, { exact: true })).toBeVisible();
  await expect(detailSheet.getByText(restaurant.phone, { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '상세정보 닫기', exact: true }).click();
  await expect(detailSheet).toHaveCount(0);

  await page.getByRole('heading', { name: restaurant.name }).click();
  const nextPhoto = page.getByRole('button', { name: '다음 메뉴' });
  await expect(nextPhoto).toBeVisible();
  await expect(page.getByText(/^메뉴 \d+$/, { exact: true })).toHaveCount(0);
  const photoProgress = page.locator('[data-ui="menu-photo-progress"]');
  await expect(photoProgress).toHaveAttribute('aria-label', '메뉴 사진 1/3');

  await nextPhoto.evaluate((button: HTMLButtonElement) => {
    for (let tap = 0; tap < 6; tap += 1) button.click();
  });

  await expect(photoProgress).toHaveAttribute('aria-label', '메뉴 사진 2/3');
  await expect(nextPhoto).toBeDisabled();
  await expect(nextPhoto).toBeEnabled({ timeout: 2_000 });
  await nextPhoto.click();
  await expect(photoProgress).toHaveAttribute('aria-label', '메뉴 사진 3/3');
  expect(browserErrors).toEqual([]);
});
