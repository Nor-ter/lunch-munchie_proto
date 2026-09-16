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

test('English Home deck preserves swipe, tap, intent and vertical pan with five tabs', async ({ page }) => {
  await page.setViewportSize({ width: 372, height: 812 });
  await mockHomeApi(page);
  await page.goto('/');
  await expect(page.locator('.tab-bar button')).toHaveCount(5);

  const foodie = page.getByRole('button', { name: 'Meal Card (selected)' });
  await expect(foodie).toBeVisible();
  await expect(foodie).toHaveCSS('touch-action', 'pan-y');

  await swipeCard(page, 'Meal Card (selected)', -80);
  const dessert = page.getByRole('button', { name: 'Dessert Card (selected)' });
  await expect(dessert).toBeVisible();
  await expect.poll(async () => {
    const [foodieBox, dessertBox] = await Promise.all([
      page.getByRole('button', { name: 'Meal Card' }).boundingBox(),
      dessert.boundingBox(),
    ]);
    return foodieBox!.x < dessertBox!.x;
  }).toBe(true);

  await swipeCard(page, 'Dessert Card (selected)', 80);
  await expect(page.getByRole('button', { name: 'Meal Card (selected)' })).toBeVisible();
  await page.getByRole('button', { name: 'Coffee Card' }).click();
  await expect(page.getByRole('button', { name: 'Coffee Card (selected)' })).toBeVisible();
  await page.getByText('Quick Match', { exact: true }).click();
  await expect(page).toHaveURL('/lunchie/settings?intent=cafe');
});
