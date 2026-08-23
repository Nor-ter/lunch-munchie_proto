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
  await expect(page.getByRole('button', { name: '필터 보기' })).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByText('근처 피드')).toHaveCount(0);

  await page.getByRole('button', { name: '필터 보기' }).click();
  await expect(page.getByRole('button', { name: '필터 보기' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText('근처 피드')).toBeVisible();

  await page.getByRole('button', { name: '필터 보기' }).click();
  await expect(page.getByRole('button', { name: '필터 보기' })).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByText('근처 피드')).toHaveCount(0);
});
