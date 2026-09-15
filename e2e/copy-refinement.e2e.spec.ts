import { expect, test } from 'playwright/test';

for (const width of [360, 390, 430]) {
  test(`lobby, voting and result copy fits ${width}px`, async ({ page }, testInfo) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width, height: 844 });
    const hostId = 'copy-host';
    const hostName = '손이에요';
    const restaurant = {
      id: 'italian-copy', name: 'Italian Test Kitchen', category: '이탈리안', tags: [],
      rating: 4.7, reviewCount: 20, distance: '350m', address: 'Melbourne',
      image: '/assets/lunchmate/1x/lunchmate_default.png',
      photos: ['/assets/lunchmate/1x/lunchmate_default.png'],
      lat: -37.81, lng: 144.96, priceRange: 2, openHours: '11:00–21:00', dietary: [],
      description: 'Fresh pasta for lunch.',
    };
    let stage: 'waiting' | 'voting' | 'done' = 'waiting';
    const forceRequests: unknown[] = [];
    await page.route('https://fonts.googleapis.com/**', route => route.fulfill({ body: '', contentType: 'text/css' }));
    await page.route('**/api/**', async route => {
      const request = route.request();
      const path = new URL(request.url()).pathname;
      let data: unknown = {};
      if (path === '/api/auth/session') data = { user: { sub: hostId, name: hostName }, profile: null };
      else if (path === '/api/restaurants') data = [restaurant];
      else if (path === '/api/feed' || path === '/api/courses') data = [];
      else if (path.endsWith('/COPY12/force')) {
        forceRequests.push(request.postDataJSON());
        stage = 'done';
        data = { ok: true };
      } else if (path.endsWith('/COPY12/results')) data = {
        phase: stage === 'done' ? 'DONE' : 'PRELIM', generation: 1,
        completedCount: stage === 'done' ? 2 : 1, totalMembers: 2,
        winnerId: stage === 'done' ? restaurant.id : null,
        memberCompletion: [
          { id: hostId, name: hostName, emoji: '😊', completed: true, swipeCount: 1, targetCount: 1 },
          { id: 'copy-guest', name: 'Alex', emoji: '🍜', completed: stage === 'done', swipeCount: 0, targetCount: 1 },
        ],
      };
      else if (path.endsWith('/COPY12') && request.method() === 'GET') data = {
        session: {
          id: 'copy-session', host_user_id: hostId, share_token: 'COPY12', group_size: 2,
          filter_distance: 2000, filter_budget: 2, filter_vibe: [], filter_dietary: [],
          deck_ids: [restaurant.id], status: stage === 'waiting' ? 'WAITING' : 'SWIPING_1',
          deadline_at: stage === 'waiting' ? null : new Date(Date.now() + 600_000).toISOString(),
        },
        members: [
          { user_id: hostId, user_name: hostName, emoji: '😊', is_ready: true },
          ...(stage === 'waiting' ? [] : [{ user_id: 'copy-guest', user_name: 'Alex', emoji: '🍜', is_ready: true }]),
        ],
      };
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify(data) });
    });
    await page.addInitScript(({ hostId, hostName, restaurant }) => {
      localStorage.setItem('lm_last_auth_uid_v1', hostId);
      localStorage.setItem('lm_profile', JSON.stringify({ id: hostId, name: hostName, emoji: '😊', dietary: [], categoryPrefs: [], totalSwipes: 0, totalLikes: 0, joinedAt: '2026-09-01' }));
      localStorage.setItem('lm_session', JSON.stringify({
        id: 'copy-session', name: `${hostName}'s lunch session`, hostId, inviteCode: 'COPY12', memberKey: 'copy-key',
        members: [{ id: hostId, name: hostName, emoji: '😊', hasVoted: false, preferences: [], ready: true }],
        filters: { partySize: 2, dietary: [], budget: 2, radius: 2000, categories: [] },
        deadline: null, deadlineMinutes: 10, status: 'waiting', restaurants: [restaurant], results: [],
      }));
    }, { hostId, hostName, restaurant });

    const capture = async (name: string) => {
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      const overflowingButtons = await page.locator('button').evaluateAll(buttons => buttons
        .filter(button => button.getBoundingClientRect().width > 0 && button.scrollWidth > button.clientWidth + 1)
        .map(button => button.textContent));
      expect(overflowingButtons).toEqual([]);
      await page.screenshot({ path: testInfo.outputPath(`${name}-${width}.png`), fullPage: true });
    };
    await page.goto('/session/lobby');
    await expect(page.getByRole('heading', { name: `Lunch with ${hostName}` })).toBeVisible();
    await expect(page.getByText(`Hosted by ${hostName} · 1 of 2 joined`)).toBeVisible();
    await expect(page.getByText('1 joined. Waiting for 1 more.')).toBeVisible();
    await expect(page.getByText('1 spot left · Tap to copy link')).toBeVisible();
    await capture('lobby');

    stage = 'voting';
    await page.goto('/lunchie/swipe');
    await expect(page.getByText('See anything you like?', { exact: true })).toBeVisible();
    await expect(page.getByText('Italian', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('이탈리안', { exact: true })).toHaveCount(0);
    await capture('swipe');
    await page.getByRole('button', { name: 'Like', exact: true }).click();
    await expect(page.getByText('Waiting for everyone to vote', { exact: true })).toBeVisible();
    await expect(page.getByText('Round 1 progress', { exact: true })).toBeVisible();
    await expect(page.getByText('1 of 2 finished', { exact: true })).toBeVisible();
    await expect(page.getByText(`${hostName} · You`, { exact: true })).toBeVisible();
    await capture('waiting');
    await page.getByRole('button', { name: 'Continue with current votes', exact: true }).click();
    await expect(page.getByText('We have a winner.', { exact: true })).toBeVisible();
    expect(forceRequests).toEqual([{ userId: hostId, round: 1 }]);
    await capture('result');
    await page.getByRole('button', { name: 'View details', exact: true }).click();
    await expect(page.getByText('Lunch is sorted', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Try another', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create a share card', exact: true })).toBeVisible();
    await capture('details');
  });
}
