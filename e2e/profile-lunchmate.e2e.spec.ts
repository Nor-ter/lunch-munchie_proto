import { expect, test, type Page } from 'playwright/test';

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
});

test('anonymous visitor sees the viewed user public room without edit controls', async ({ page }) => {
  await mockBaseApis(page);
  await page.route('**/api/users/public-user', route => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({
      id: 'public-user', username: 'Public User', handle: 'public_user', profile_image_url: null,
      bio: null, location: null, created_at: 1, lunchmate: lunchmate('blue-note'),
    }),
  }));

  await page.goto('/profile/public-user');
  await expect(page.getByTestId('public-lunchmate-room')).toBeVisible();
  await expect(page.getByText('보기 전용')).toBeVisible();
  await expect(page.locator('[data-lunchmate-room-background="profile"]')).toBeVisible();
  await expect(page.locator('[data-lunchmate-artwork="chicken"]')).toBeVisible();
  await expect(
    page.getByRole('region', { name: '읽기 전용 런치메이트 룸' }).getByRole('button'),
  ).toHaveCount(0);

  await page.reload();
  await expect(page.getByText('Public User', { exact: true })).toBeVisible();
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
