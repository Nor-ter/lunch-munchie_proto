import { expect, test } from 'playwright/test';

// 한 테스트/브라우저 컨텍스트에서 전 시나리오를 돈다. 테스트마다 새 컨텍스트를 만들면
// ensureAnonymousSession이 운영 Supabase auth.users에 불필요한 익명 계정을 계속 추가한다.
test('web follow and login smoke flow', async ({ page }) => {
  await page.goto('/profile');
  await expect(page.getByTestId('app-identity')).toHaveAttribute('data-identity-aligned', 'true');
  await expect(page.getByRole('button', { name: '팔로워 목록' })).toBeVisible();
  await expect(page.getByRole('button', { name: '팔로잉 목록' })).toBeVisible();

  await page.goto('/feed');
  const author = page.getByTestId('feed-author-f1');
  await expect(author).toBeEnabled();
  await author.click();
  await expect(page).toHaveURL(/\/profile\/[0-9a-f-]+$/);
  await expect(page.getByTestId('follow-button')).toHaveCount(0);

  await page.goto('/profile/not-a-real-user');
  await expect(page.getByRole('heading', { name: '유저를 찾을 수 없어요' })).toBeVisible();

  await page.goto('/profile');
  await expect(page.getByRole('button', { name: '로그인', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: '프로필 설정' }).click();
  const settingsSheet = page.getByTestId('profile-settings-sheet');
  await expect(settingsSheet).toBeVisible();
  const settingsBox = await settingsSheet.boundingBox();
  expect(settingsBox?.width).toBeLessThanOrEqual(430);
  expect(settingsBox?.x).toBeGreaterThan(0);
  await expect(page.getByRole('button', { name: 'Google로 로그인' })).toBeVisible();

  await page.goto('/profile?error_code=identity_already_exists&error_description=used');
  await expect(page.getByRole('alertdialog')).toBeVisible();
  await expect(page.getByText('현재 익명 계정의 로컬 데이터와 소유권은 자동으로 옮겨지지 않아요.')).toBeVisible();
  await page.getByRole('button', { name: '취소' }).click();
  await expect(page).not.toHaveURL(/error_code/);
});
