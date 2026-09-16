import { expect, test, type Page } from 'playwright/test';

async function mockPrototype(page: Page) {
  await page.route('**/api/**', route => {
    const path = new URL(route.request().url()).pathname;
    const data = path === '/api/auth/session'
      ? { user: { sub: 'english-ui', name: 'Alex' }, profile: { id: 'english-ui', username: 'Alex', handle: 'alex' } }
      : /\/(restaurants|courses|feed)$/.test(path) ? [] : {};
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify(data) });
  });
  await page.addInitScript(() => {
    localStorage.setItem('lm_last_auth_uid_v1', 'english-ui');
    localStorage.setItem('lm_profile', JSON.stringify({ id: 'english-ui', name: 'Alex', emoji: '😊', dietary: [], categoryPrefs: [], totalSwipes: 0, totalLikes: 0, joinedAt: '2026-09-01' }));
  });
}

for (const width of [360, 390, 430]) {
  test(`English prototype screens fit ${width}px`, async ({ page }, testInfo) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width, height: 844 });
    await mockPrototype(page);
    for (const [name, route] of Object.entries({ home: '/', feed: '/feed', saved: '/saved', profile: '/profile', room: '/profile/foodie-room', settings: '/lunchie/settings', create: '/coursemap/new', templates: '/templates', onboarding: '/onboarding', lobby: '/session/lobby' })) {
      await page.goto(route);
      await expect(page.locator('html')).toHaveAttribute('lang', 'en');
      await expect(page.locator('#root')).not.toBeEmpty();
      await expect.poll(() => page.locator('body').innerText()).not.toContain('Getting Lunchie Munchie ready');
      await page.screenshot({ path: testInfo.outputPath(`${name}-${width}.png`), fullPage: true });
      const audit = await page.evaluate(() => {
        const root = document.querySelector('#root')!;
        const text = (root as HTMLElement).innerText;
        const labels = Array.from(root.querySelectorAll('[aria-label], [title], input, textarea')).map(el => [el.getAttribute('aria-label'), el.getAttribute('title'), el.getAttribute('placeholder')].join(' ')).join(' ');
        return { korean: (text + labels).match(/[가-힣]+/g) ?? [], overflow: document.documentElement.scrollWidth > innerWidth + 1 };
      });
      expect(audit.korean, `${name}: untranslated UI`).toEqual([]);
      expect(audit.overflow, `${name}: horizontal overflow`).toBe(false);
      if (name === 'feed') {
        await page.getByRole('button', { name: 'Show filters' }).click();
        await expect(page.getByText('Nearby posts', { exact: true })).toBeVisible();
        await page.screenshot({ path: testInfo.outputPath(`feed-filters-${width}.png`), fullPage: true });
      }
      if (name === 'profile') {
        await page.getByRole('button', { name: 'Profile settings', exact: true }).click();
        await expect(page.getByText('No dairy', { exact: true })).toBeVisible();
        await page.screenshot({ path: testInfo.outputPath(`profile-settings-${width}.png`), fullPage: true });
        const save = page.getByTestId('profile-settings-sheet').getByRole('button', { name: 'Save', exact: true });
        await save.scrollIntoViewIfNeeded();
        const box = await save.boundingBox();
        const nav = await page.locator('.tab-bar').boundingBox();
        expect(box!.y + box!.height).toBeLessThanOrEqual(nav!.y);
      }
    }
  });
}
