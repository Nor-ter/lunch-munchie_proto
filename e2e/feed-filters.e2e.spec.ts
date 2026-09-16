import { expect, test } from 'playwright/test';

test('feed page starts with filter options closed', async ({ page }) => {
  await page.route('**/api/auth/session', route => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({ user: null }),
  }));
  await page.route('**/api/feed**', route => route.fulfill({
    contentType: 'application/json',
    body: '[]',
  }));

  await page.goto('/feed');
  await expect(page.getByRole('heading', { name: 'MUNCHIE FEED' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Show filters' })).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByText('Nearby posts')).toHaveCount(0);

  await page.getByRole('button', { name: 'Show filters' }).click();
  await expect(page.getByRole('button', { name: 'Show filters' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText('Nearby posts')).toBeVisible();

  await page.getByRole('button', { name: 'Show filters' }).click();
  await expect(page.getByRole('button', { name: 'Show filters' })).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByText('Nearby posts')).toHaveCount(0);
});
