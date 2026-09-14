import { expect, test, type Page } from 'playwright/test';

const USER_ID = 'profile-grab-e2e-user';

async function prepareAuthenticatedProfile(page: Page) {
  await page.route('https://fonts.googleapis.com/**', route => route.fulfill({
    status: 200,
    contentType: 'text/css',
    body: '',
  }));
  await page.route('https://cdn.jsdelivr.net/**', route => route.fulfill({
    status: 200,
    contentType: 'text/css',
    body: '',
  }));
  await page.route('**/api/**', async route => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname === '/api/auth/session') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: { sub: USER_ID, name: '드래그 테스트' },
          profile: {
            id: USER_ID,
            username: '드래그 테스트',
            handle: 'grab_test',
            profile_image_url: null,
          },
        }),
      });
      return;
    }
    if (pathname === '/api/feed' || pathname === '/api/courses') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });

  await page.addInitScript((userId) => {
    localStorage.setItem('lm_last_auth_uid_v1', userId);
    localStorage.setItem('lm_profile', JSON.stringify({
      id: userId,
      name: '드래그 테스트',
      handle: 'grab_test',
      emoji: '😊',
      dietary: [],
      categoryPrefs: [],
      totalSwipes: 0,
      totalLikes: 0,
      joinedAt: new Date().toISOString(),
    }));
  }, USER_ID);
}

async function readGrabLayerAndShadowRects(page: Page) {
  return page.evaluate(() => {
    const layer = document.querySelector<HTMLElement>(
      '[data-lunchmate-profile-grab-position="true"]',
    );
    const shadow = document.querySelector<HTMLElement>(
      '[data-lunchmate-profile-moving-shadow="true"]',
    );

    if (!layer || !shadow) {
      throw new Error('Expected the profile grab layer and its moving shadow to be rendered');
    }

    // Read both rects synchronously so an animation frame cannot advance between them.
    const layerRect = layer.getBoundingClientRect();
    const shadowRect = shadow.getBoundingClientRect();

    return {
      layer: { x: layerRect.x, centerX: layerRect.x + (layerRect.width / 2) },
      shadow: { x: shadowRect.x, centerX: shadowRect.x + (shadowRect.width / 2) },
    };
  });
}

test('character grabs on a short move and carries its shadow with it', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await prepareAuthenticatedProfile(page);
  await page.goto('/profile');

  const character = page.locator('[data-lunchmate-profile-grab]');
  const movingLayer = page.locator('[data-lunchmate-profile-grab-position="true"]');
  const shadow = page.locator('[data-lunchmate-profile-moving-shadow="true"]');
  await expect(character).toHaveAttribute('data-lunchmate-profile-grab', 'idle');

  const characterBox = await character.boundingBox();
  expect(characterBox).not.toBeNull();
  const startX = characterBox!.x + (characterBox!.width / 2);
  const startY = characterBox!.y + (characterBox!.height / 2);

  await page.mouse.move(startX, startY);
  await page.mouse.down();

  // 손떨림 수준의 3px 이동은 누르는 피드백을 유지한다.
  // 정지 상태로 LUNCHMATE_PROFILE_LONG_PRESS_MS(400ms)가 지나면 long-press 자동 잡기가
  // 걸리므로, 단언 왕복을 사이에 두지 않고 pointerdown 직후 곧바로 움직인다.
  await page.mouse.move(startX + 3, startY);
  await expect(character).toHaveAttribute('data-lunchmate-profile-grab', 'pressing');
  await expect(character).toHaveCSS('cursor', 'grabbing');

  // 4px부터 기다림 없이 잡히고, 포인터가 원래 영역을 벗어나도 capture가 이동을 잇는다.
  await page.mouse.move(startX + 5, startY - 2);
  await expect(character).toHaveAttribute('data-lunchmate-profile-grab', 'grabbed');
  await expect(character).toHaveAttribute('data-lunchmate-profile-expression', 'surprised');
  await expect(character).toHaveAttribute('aria-label', '놀란 런치메이트 캐릭터, 드래그 중');

  const before = await readGrabLayerAndShadowRects(page);

  await page.mouse.move(startX + 76, startY - 34, { steps: 4 });
  await expect.poll(async () => (await movingLayer.boundingBox())?.x ?? 0).toBeGreaterThan(
    before.layer.x + 30,
  );
  await expect.poll(async () => (await shadow.boundingBox())?.x ?? 0).toBeGreaterThan(
    before.shadow.x + 30,
  );

  const after = await readGrabLayerAndShadowRects(page);
  // 그림자는 잡는 동안 scaleX가 줄어드므로 left가 아니라 중심 이동을 비교한다.
  const layerDeltaX = after.layer.centerX - before.layer.centerX;
  const shadowDeltaX = after.shadow.centerX - before.shadow.centerX;
  expect(Math.abs(layerDeltaX - shadowDeltaX)).toBeLessThan(2);

  await page.mouse.up();
  await expect(character).toHaveAttribute('data-lunchmate-profile-grab', 'landing');

  // 복귀 애니메이션 중에도 보이는 캐릭터를 다시 잡고 바로 옮길 수 있어야 한다.
  // Linux CI의 Playwright boundingBox는 overflow clip·그림자 때문에 중심이 수 px~수십 px
  // 어긋나므로, 픽셀 고정은 유닛 테스트가 담당하고 여기선 제스처 계약을 본다.
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const visibleBox = await movingLayer.boundingBox();
    expect(visibleBox).not.toBeNull();
    const regrabX = visibleBox!.x + (visibleBox!.width / 2);
    const regrabY = visibleBox!.y + (visibleBox!.height / 2) - 4;
    await page.mouse.move(regrabX, regrabY);
    await page.mouse.down();
    await expect(character).toHaveAttribute('data-lunchmate-profile-grab', 'pressing');

    const direction = attempt % 2 === 0 ? -1 : 1;
    await page.mouse.move(regrabX + (direction * 6), regrabY - 2);
    await expect(character).toHaveAttribute('data-lunchmate-profile-grab', 'grabbed');
    await page.mouse.up();
    await expect(character).toHaveAttribute('data-lunchmate-profile-grab', 'landing');
  }
  await expect(character).toHaveAttribute('data-lunchmate-profile-grab', 'idle', { timeout: 2_000 });

  // 탭 표정이 재생 중이어도 자동 순찰만 멈추며, 잡기 입력은 차단하지 않는다.
  const idleBox = await character.boundingBox();
  expect(idleBox).not.toBeNull();
  const tapX = idleBox!.x + (idleBox!.width / 2);
  const tapY = idleBox!.y + (idleBox!.height / 2);
  await page.mouse.click(tapX, tapY);
  await expect(page.locator('[data-lunchmate-profile-tap-face]'))
    .toHaveAttribute('data-lunchmate-profile-tap-face', 'surprised');
  await page.mouse.move(tapX, tapY);
  await page.mouse.down();
  await expect(character).toHaveAttribute('data-lunchmate-profile-grab', 'pressing');
  await page.mouse.move(tapX + 6, tapY - 2);
  await expect(character).toHaveAttribute('data-lunchmate-profile-grab', 'grabbed');
  await page.mouse.up();
});
