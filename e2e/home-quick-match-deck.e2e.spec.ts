import { expect, test, type Page } from 'playwright/test';

async function mockHomeApi(page: Page) {
  await page.route('https://fonts.googleapis.com/**', route => route.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  await page.route('https://cdn.jsdelivr.net/**', route => route.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  await page.route('**/api/**', route => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname === '/api/auth/session') {
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ user: null }) });
    }
    return route.fulfill({ contentType: 'application/json', body: '[]' });
  });
}

async function swipeCard(page: Page, accessibleName: string, distanceX: number) {
  const card = page.getByRole('button', { name: accessibleName });
  const box = await card.boundingBox();
  expect(box).not.toBeNull();
  const startX = box!.x + box!.width / 2;
  const startY = box!.y + box!.height / 2;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + distanceX, startY, { steps: 8 });
  await page.mouse.up();
}

test('mobile Quick Match deck follows swipe direction and preserves tap, intent, and vertical pan', async ({ page }) => {
  await page.setViewportSize({ width: 372, height: 812 });
  await mockHomeApi(page);
  await page.goto('/legacy/home');

  const foodie = page.getByRole('button', { name: '밥 카드 (선택됨)' });
  await expect(foodie).toBeVisible();
  await expect(foodie).toHaveCSS('touch-action', 'pan-y');

  await swipeCard(page, '밥 카드 (선택됨)', -80);
  const dessert = page.getByRole('button', { name: '디저트 카드 (선택됨)' });
  await expect(dessert).toBeVisible();
  await expect.poll(async () => {
    const [foodieBox, dessertBox] = await Promise.all([
      page.getByRole('button', { name: '밥 카드' }).boundingBox(),
      dessert.boundingBox(),
    ]);
    return foodieBox!.x < dessertBox!.x;
  }).toBe(true);

  await swipeCard(page, '디저트 카드 (선택됨)', 80);
  await expect(page.getByRole('button', { name: '밥 카드 (선택됨)' })).toBeVisible();
  await expect.poll(async () => {
    const [dessertBox, foodieBox] = await Promise.all([
      page.getByRole('button', { name: '디저트 카드' }).boundingBox(),
      page.getByRole('button', { name: '밥 카드 (선택됨)' }).boundingBox(),
    ]);
    return dessertBox!.x > foodieBox!.x;
  }).toBe(true);

  await page.getByRole('button', { name: '커피 카드' }).click();
  await expect(page.getByRole('button', { name: '커피 카드 (선택됨)' })).toBeVisible();
  await page.getByRole('button', { name: 'Quick Match!' }).click();
  await expect(page).toHaveURL('/lunchie/settings?intent=cafe');
});
