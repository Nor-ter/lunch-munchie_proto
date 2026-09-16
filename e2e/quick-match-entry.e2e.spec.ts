import { expect, test } from 'playwright/test';

test('Quick Match remains directly reachable within the five-tab English navigation', async ({ page }) => {
  await page.setViewportSize({ width: 372, height: 812 });
  await page.route('https://fonts.googleapis.com/**', route => route.fulfill({ contentType: 'text/css', body: '' }));
  await page.route('https://cdn.jsdelivr.net/**', route => route.fulfill({ contentType: 'text/css', body: '' }));
  await page.route('**/api/**', route => {
    const pathname = new URL(route.request().url()).pathname;
    return route.fulfill({ contentType: 'application/json', body: pathname === '/api/auth/session' ? '{"user":null}' : '[]' });
  });
  await page.goto('/lunchie/settings');
  const tabs = page.locator('.tab-bar button');
  await expect(tabs).toHaveCount(5);
  await expect.poll(() => tabs.evaluateAll(elements => elements.map(element => element.getAttribute('aria-label'))))
    .toEqual(['Home', 'Feed', 'Quick Match', 'Saved', 'Profile']);
  await expect(page.locator('header button')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Quick Match!' })).toHaveCount(0);
  await page.locator('.tab-bar').getByRole('button', { name: 'Feed', exact: true }).click();
  await expect(page).toHaveURL('/feed');
  await page.locator('.tab-bar').getByRole('button', { name: 'Quick Match', exact: true }).click();
  await expect(page).toHaveURL('/lunchie/settings');
  await page.reload();
  await expect(page.locator('header button')).toHaveCount(0);
  await page.locator('.tab-bar').getByRole('button', { name: 'Home', exact: true }).click();
  await expect(page).toHaveURL('/');
});
