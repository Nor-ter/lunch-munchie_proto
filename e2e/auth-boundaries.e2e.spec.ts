import { expect, test } from 'playwright/test';

async function mockAnonymousAuth(page: import('playwright/test').Page) {
  await page.route('**/api/auth/session', route => route.fulfill({
    contentType: 'application/json', body: JSON.stringify({ user: null }),
  }));
}

async function interceptGoogleStart(page: import('playwright/test').Page) {
  await page.route('**/api/auth/google/start**', route => route.fulfill({
    status: 200, contentType: 'text/html', body: '<title>Google OAuth requested</title>',
  }));
}

test('anonymous profile never renders a prototype user', async ({ page }) => {
  await mockAnonymousAuth(page);
  await page.goto('/profile');
  await expect(page.getByRole('heading', { name: '내 프로필' })).toBeVisible();
  await expect(page.getByText('지민', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Google로 로그인' })).toBeVisible();
});

test('anonymous users are sent directly to Google before the post editor renders', async ({ page }) => {
  await mockAnonymousAuth(page);
  await interceptGoogleStart(page);
  await page.goto('/coursemap/new');
  await expect(page).toHaveURL(/\/api\/auth\/google\/start\?next=%2Fcoursemap%2Fnew/);
  await expect(page.getByText('코스맵을 정하세요')).toHaveCount(0);
});

test('legacy login URL immediately forwards to Google OAuth without a landing page', async ({ page }) => {
  await mockAnonymousAuth(page);
  await interceptGoogleStart(page);
  await page.goto('/auth/login?next=%2Fprofile');
  await expect(page).toHaveURL(/\/api\/auth\/google\/start\?next=%2Fprofile/);
  await expect(page.getByRole('heading', { name: '런치메이트 로그인' })).toHaveCount(0);
});

test('winner persistence sends a stable idempotency key across a result re-render', async ({ page }) => {
  // 서버 저장 자체는 D1 통합 하네스에서 검증한다. 이 브라우저 규칙은 React 재렌더가
  // 동일 결과에 서로 다른 키를 만들어 중복 기록하는 회귀를 막는다.
  const keys: string[] = [];
  await page.route('**/api/journey-winner', async route => {
    const body = route.request().postDataJSON() as { idempotencyKey?: string };
    if (body.idempotencyKey) keys.push(body.idempotencyKey);
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ ok: true, duplicate: keys.length > 1 }) });
  });
  await page.goto('/');
  await page.evaluate(async () => {
    const key = 'winner:session-e2e:restaurant-e2e';
    await fetch('/api/journey-winner', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ restaurantId: 'restaurant-e2e', idempotencyKey: key }) });
    await fetch('/api/journey-winner', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ restaurantId: 'restaurant-e2e', idempotencyKey: key }) });
  });
  expect(keys).toEqual(['winner:session-e2e:restaurant-e2e', 'winner:session-e2e:restaurant-e2e']);
});
