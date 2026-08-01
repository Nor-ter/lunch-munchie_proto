import { expect, test } from 'playwright/test';

test.use({ storageState: { cookies: [], origins: [] } });

test('anonymous visitor sees no prototype identity and protected writing goes straight to Google', async ({ page }) => {
  await page.goto('/profile');
  await expect(page.getByRole('heading', { name: '내 프로필' })).toBeVisible();
  await expect(page.getByText('지민', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Google로 로그인' })).toBeVisible();

  await page.goto('/coursemap/new');
  await page.waitForURL(url => url.hostname === 'accounts.google.com', { timeout: 30_000 });
  const google = new URL(page.url());
  expect(google.hostname).toBe('accounts.google.com');
  expect(google.searchParams.get('client_id')).toBeTruthy();
  expect(google.searchParams.get('redirect_uri')).toContain('/api/auth/google/callback');
});
