import { expect, test } from 'playwright/test';

test('Quick Match is the entry screen without legacy home controls', async ({ page }) => {
  await page.setViewportSize({ width: 372, height: 812 });
  await page.route('https://fonts.googleapis.com/**', route => route.fulfill({ contentType: 'text/css', body: '' }));
  await page.route('https://cdn.jsdelivr.net/**', route => route.fulfill({ contentType: 'text/css', body: '' }));
  await page.route('**/api/**', route => {
    const pathname = new URL(route.request().url()).pathname;
    return route.fulfill({ contentType: 'application/json', body: pathname === '/api/auth/session' ? '{"user":null}' : '[]' });
  });
  await page.goto('/');
  await expect(page).toHaveURL('/lunchie/settings');
  await expect(page.locator('.tab-bar button')).toHaveCount(4);
  await expect(page.locator('header button')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '홈 · 오늘의 여정' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Quick Match!' })).toHaveCount(0);
  await page.locator('.tab-bar').getByRole('button', { name: '피드', exact: true }).click();
  await expect(page).toHaveURL('/feed');
  await page.locator('.tab-bar').getByRole('button', { name: 'Quick Match', exact: true }).click();
  await expect(page).toHaveURL('/lunchie/settings');
  await page.reload();
  await expect(page.locator('header button')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '홈 · 오늘의 여정' })).toHaveCount(0);
});
