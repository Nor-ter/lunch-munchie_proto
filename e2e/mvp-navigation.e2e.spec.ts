import { expect, test, type Page } from 'playwright/test';

async function mockDiscoveryApi(page: Page, feedItems: unknown[] = []) {
  await page.route('**/api/auth/session', route => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({ user: null }),
  }));
  await page.route('**/api/feed**', route => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({ items: feedItems, nextCursor: null, hasMore: false }),
  }));
  await page.route('**/api/restaurants**', route => route.fulfill({
    contentType: 'application/json',
    body: '[]',
  }));
  await page.route('**/api/courses**', route => route.fulfill({
    contentType: 'application/json',
    body: '[]',
  }));
}

test('Munchie MVP opens on discovery with a focused three-action navigation', async ({ page }) => {
  await mockDiscoveryApi(page);

  await page.goto('/');

  await expect(page).toHaveURL(/\/feed$/);
  await expect(page.getByRole('button', { name: '사용자 검색 열기' })).toBeVisible();
  const navigation = page.getByRole('navigation', { name: '주요 메뉴' });
  await expect(navigation.getByRole('button', { name: '발견' })).toHaveAttribute('aria-current', 'page');
  await expect(navigation.getByRole('button', { name: '저장' })).toBeVisible();
  await expect(navigation.getByRole('button', { name: '게시' })).toHaveCount(0);
  await expect(navigation.getByRole('button', { name: '내 정보' })).toBeVisible();
  await expect(navigation.getByRole('button', { name: '홈' })).toHaveCount(0);
  await expect(navigation.getByRole('button', { name: '런치' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '코스 만들기' })).toBeVisible();
  await expect(page.getByText('아직 Munchie 피드가 없어요')).toBeVisible();
});

test('discovery course FAB stays above the tab bar at mobile widths while the feed scrolls', async ({ page }) => {
  const createdAt = new Date().toISOString();
  await mockDiscoveryApi(page, [{
    id: 'fab-post', courseId: 'fab-course', creatorId: 'fab-author',
    authorName: 'FAB 작성자', authorImage: null, title: 'FAB가 보이는 피드',
    description: '스크롤 고정 확인', heroImage: '', photos: [], decor: [],
    templateId: null, tags: ['맛집'], stops: [], likesCount: 0,
    savesCount: 0, commentsCount: 0, comments: [], createdAt,
  }]);

  for (const width of [360, 390, 430]) {
    await page.setViewportSize({ width, height: 740 });
    await page.goto('/feed');
    await expect(page.getByText('FAB가 보이는 피드')).toBeVisible();
    const fab = page.getByRole('button', { name: '코스 만들기' });
    await page.screenshot({ path: test.info().outputPath('fab-' + width + '.png') });
    await expect(fab.locator('svg')).toHaveAttribute('width', '25');
    await expect(fab.locator('svg')).toHaveAttribute('stroke-width', '2');
    const navigation = page.getByRole('navigation', { name: '주요 메뉴' });
    const before = await fab.boundingBox();
    const navBox = await navigation.boundingBox();
    expect(before).not.toBeNull();
    expect(navBox).not.toBeNull();
    expect(Math.round(before!.width)).toBe(58);
    expect(Math.round(width - before!.x - before!.width)).toBe(18);
    expect(Math.round(navBox!.y - before!.y - before!.height)).toBe(14);

    await page.locator('main').evaluate(main => {
      const spacer = document.createElement('div');
      spacer.style.height = '2000px';
      main.append(spacer);
    });
    const scroller = page.locator('[data-scroll-route="/feed"]');
    await scroller.evaluate(element => element.scrollTo({ top: 900 }));
    await expect.poll(() => scroller.evaluate(element => element.scrollTop)).toBeGreaterThan(800);
    const after = await fab.boundingBox();
    expect(after).not.toBeNull();
    expect(Math.round(after!.y)).toBe(Math.round(before!.y));
  }
});

test('guest Settings keeps public preferences available and hides account-only actions', async ({ page }) => {
  let authStartUrl = '';
  await mockDiscoveryApi(page);
  await page.route('**/api/auth/google/start**', async route => {
    authStartUrl = route.request().url();
    await route.fulfill({ contentType: 'text/html', body: '<h1>Settings Google login boundary</h1>' });
  });

  await page.goto('/settings');
  await expect(page).toHaveURL(/\/settings$/);
  await expect(page.getByTestId('settings-login-card')).toBeVisible();
  await expect(page.getByTestId('settings-profile-summary')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /알림/ })).toHaveCount(0);
  await expect(page.getByText('로그인 및 보안')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '로그아웃' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '계정 삭제' })).toHaveCount(0);
  await expect(page.getByText('언어', { exact: true })).toBeVisible();
  await expect(page.getByText('테마', { exact: true })).toBeVisible();
  await expect(page.getByText('문의 및 피드백', { exact: true })).toBeVisible();
  await expect(page.getByText('개인정보 처리방침', { exact: true })).toBeVisible();
  await expect(page.getByText('이용약관', { exact: true })).toBeVisible();
  await expect(page.getByText('1.0.0', { exact: true })).toBeVisible();
  expect(authStartUrl).toBe('');

  await expect(page.getByRole('button', { name: /음식 취향/ })).toHaveCount(0);
  await page.goto('/settings/food-preferences');
  await expect(page).toHaveURL(/\/settings\/food-preferences$/);
  await page.getByRole('button', { name: /좋아하는 음식/ }).click();
  await page.getByRole('button', { name: '한식', exact: true }).click();
  await page.getByRole('button', { name: /식단 선호/ }).click();
  await page.getByRole('button', { name: /비건/ }).click();
  await page.getByRole('button', { name: '저장하기' }).click();
  await expect(page).toHaveURL(/\/settings$/);
  await expect(page.getByRole('button', { name: /음식 취향/ })).toHaveCount(0);
  expect(authStartUrl).toBe('');

  await page.reload();
  await expect(page.getByRole('button', { name: /음식 취향/ })).toHaveCount(0);
  await page.goto('/settings/food-preferences');
  await expect(page.getByRole('button', { name: /좋아하는 음식 한식/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /식단 선호 비건/ })).toBeVisible();
  await expect(page.getByText('VEGAN', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: '뒤로 가기' }).click();

  await page.getByTestId('settings-login-card').click();
  await expect(page.getByRole('heading', { name: 'Settings Google login boundary' })).toBeVisible();
  expect(new URL(authStartUrl).searchParams.get('next')).toBe('/profile');
});

test('guest profile Settings gear opens public Settings and only the login card starts OAuth', async ({ page }) => {
  let authStartUrl = '';
  await mockDiscoveryApi(page);
  await page.route('**/api/auth/google/start**', async route => {
    authStartUrl = route.request().url();
    await route.fulfill({ contentType: 'text/html', body: '<h1>Profile Settings login boundary</h1>' });
  });

  await page.goto('/profile');
  await page.getByRole('button', { name: '프로필 설정' }).click();

  await expect(page).toHaveURL(/\/settings$/);
  await expect(page.getByTestId('settings-login-card')).toBeVisible();
  expect(authStartUrl).toBe('');

  await page.getByTestId('settings-login-card').click();
  await expect(page.getByRole('heading', { name: 'Profile Settings login boundary' })).toBeVisible();
  expect(new URL(authStartUrl).searchParams.get('next')).toBe('/profile');
});

test('guest direct account Settings route uses the existing Google auth boundary', async ({ page }) => {
  let authStartUrl = '';
  await mockDiscoveryApi(page);
  await page.route('**/api/auth/google/start**', async route => {
    authStartUrl = route.request().url();
    await route.fulfill({ contentType: 'text/html', body: '<h1>Protected Settings boundary</h1>' });
  });

  await page.goto('/settings/profile');

  await expect(page.getByRole('heading', { name: 'Protected Settings boundary' })).toBeVisible();
  expect(new URL(authStartUrl).searchParams.get('next')).toBe('/settings/profile');
});

test('profile settings use full pages and preserve existing profile and dietary persistence', async ({ page }) => {
  test.setTimeout(60_000);
  let loggedIn = true;
  await page.route('**/api/auth/session', route => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify(loggedIn ? {
      user: { sub: 'settings-user', name: 'Soeun Kwon', email: 'kwonsoeun.long.address@example.com' },
      profile: { id: 'settings-user', username: 'Soeun Kwon', handle: 'so_oeunn', profile_image_url: null },
    } : { user: null }),
  }));
  await page.route('**/api/feed**', route => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({ items: [], nextCursor: null, hasMore: false }),
  }));
  await page.route('**/api/restaurants**', route => route.fulfill({ contentType: 'application/json', body: '[]' }));
  await page.route('**/api/courses**', route => route.fulfill({ contentType: 'application/json', body: '[]' }));
  await page.route('**/api/profile', async route => {
    if (route.request().method() !== 'PATCH') return route.fallback();
    const body = route.request().postDataJSON() as { username: string; handle: string };
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ profile: { username: body.username, handle: body.handle } }),
    });
  });
  await page.setViewportSize({ width: 360, height: 740 });

  await page.goto('/profile');
  await page.getByRole('button', { name: '프로필 설정' }).click();
  await expect(page).toHaveURL(/\/settings$/);
  await expect(page.getByRole('navigation', { name: '주요 메뉴' })).toHaveCount(0);
  await expect(page.getByTestId('google-account-card')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '로그아웃' })).toHaveCount(0);
  await expect(page.locator('section').filter({ has: page.getByText('프로필', { exact: true }) })).toHaveCount(0);
  await expect(page.getByText('로그인 및 보안')).toHaveCount(0);
  await expect(page.getByText('계정', { exact: true })).toHaveCount(0);
  await expect(page.getByText('일반', { exact: true })).toBeVisible();
  await expect(page.getByText('언어', { exact: true })).toBeVisible();
  await expect(page.getByText('한국어', { exact: true })).toBeVisible();
  await expect(page.getByText('테마', { exact: true })).toBeVisible();
  await expect(page.getByText('시스템 설정', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /언어/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /테마/ })).toHaveCount(0);
  await expect(page.getByText('문의 및 피드백', { exact: true })).toBeVisible();
  await expect(page.getByText('개인정보 처리방침', { exact: true })).toBeVisible();
  await expect(page.getByText('이용약관', { exact: true })).toBeVisible();
  await expect(page.getByText('앱 버전', { exact: true })).toBeVisible();
  await expect(page.getByText('1.0.0', { exact: true })).toBeVisible();
  await expect(page.getByText('준비 중', { exact: true })).toHaveCount(5);
  await page.getByTestId('settings-profile-summary').click();
  await expect(page.getByText('kwonsoeun.long.address@example.com')).toBeVisible();
  const googleCardBox = await page.getByTestId('google-account-card').boundingBox();
  const logoutCardBox = await page.getByRole('button', { name: '로그아웃' }).boundingBox();
  expect(googleCardBox).not.toBeNull();
  expect(logoutCardBox).not.toBeNull();
  expect(Math.round(logoutCardBox!.y - googleCardBox!.y - googleCardBox!.height)).toBeGreaterThanOrEqual(8);

  await expect(page.getByRole('button', { name: '사진 변경' })).toBeVisible();
  const avatarPreviewBox = await page.getByTestId('profile-edit-avatar-preview').boundingBox();
  expect(avatarPreviewBox).not.toBeNull();
  expect(Math.round(avatarPreviewBox!.width)).toBe(80);
  await page.getByLabel('이름').fill('Soeun Kwon');
  await page.getByLabel('아이디').fill('so_oeunn');
  await page.getByRole('button', { name: '저장하기' }).click();
  await expect(page).toHaveURL(/\/settings$/);

  await expect(page.getByRole('button', { name: /음식 취향/ })).toHaveCount(0);
  await page.goto('/settings/food-preferences');
  await expect(page.getByRole('button', { name: /좋아하는 음식/ })).toHaveAttribute('aria-expanded', 'false');
  await expect(page.getByRole('button', { name: '한식', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: /좋아하는 음식/ }).click();
  await page.getByRole('button', { name: '한식', exact: true }).click();
  await page.getByRole('button', { name: /식단 선호/ }).click();
  await expect(page.getByRole('button', { name: '한식', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: /비건/ }).click();
  await page.getByRole('button', { name: /피하고 싶은 음식/ }).click();
  await page.getByRole('button', { name: /견과류/ }).click();
  await expect(page.getByRole('button', { name: /식단 선호 비건/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /피하고 싶은 음식 견과류/ })).toBeVisible();
  await expect(page.getByText('VEGAN', { exact: true })).toHaveCount(0);
  await expect(page.getByText('NO_NUTS', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: /좋아하는 음식/ }).click();
  await expect(page.getByRole('button', { name: '한식', exact: true })).toHaveAttribute('aria-pressed', 'true');
  const selectedChipStyle = await page.getByRole('button', { name: '한식', exact: true }).evaluate(element => ({
    backgroundColor: getComputedStyle(element).backgroundColor,
    borderColor: getComputedStyle(element).borderColor,
    color: getComputedStyle(element).color,
  }));
  const unselectedChipStyle = await page.getByRole('button', { name: '일식', exact: true }).evaluate(element => ({
    backgroundColor: getComputedStyle(element).backgroundColor,
    borderColor: getComputedStyle(element).borderColor,
    color: getComputedStyle(element).color,
  }));
  expect(selectedChipStyle).not.toEqual(unselectedChipStyle);
  expect(selectedChipStyle.backgroundColor).toBe('rgb(255, 228, 230)');
  expect(selectedChipStyle.borderColor).toBe('rgb(232, 80, 83)');
  await page.getByRole('button', { name: '전체 해제' }).click();
  await expect(page.getByRole('button', { name: '한식', exact: true })).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByText('선택한 항목 없음')).toHaveCount(3);
  await page.getByRole('button', { name: '한식', exact: true }).click();
  await page.getByRole('button', { name: /식단 선호/ }).click();
  await page.getByRole('button', { name: /비건/ }).click();
  await page.getByRole('button', { name: /피하고 싶은 음식/ }).click();
  await page.getByRole('button', { name: /견과류/ }).click();
  await page.getByRole('button', { name: '저장하기' }).click();
  await expect(page).toHaveURL(/\/settings$/);
  await expect(page.getByRole('button', { name: /음식 취향/ })).toHaveCount(0);

  await page.getByRole('button', { name: /알림/ }).click();
  await expect(page).toHaveURL(/\/settings\/notifications$/);
  await expect(page.getByText('알림 설정을 준비하고 있어요')).toBeVisible();
  await page.getByRole('button', { name: '뒤로 가기' }).click();

  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: '계정 삭제' }).click();
  await expect(page.getByText('현재 계정 삭제 기능은 아직 제공되지 않습니다.')).toBeVisible();

  for (const width of [360, 390, 430]) {
    await page.setViewportSize({ width, height: 740 });
    for (const path of ['/settings', '/settings/profile', '/settings/food-preferences']) {
      await page.goto(path);
      await expect(page.getByRole('heading', { name: path === '/settings' ? '설정' : path === '/settings/profile' ? '프로필 편집' : '음식 취향', exact: true })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      await page.screenshot({ path: test.info().outputPath(path.replaceAll('/', '-') + '-' + width + '.png'), fullPage: true });
      if (path === '/settings') continue;
      const saveBar = page.getByTestId('settings-save-bar');
      await expect(saveBar).toBeVisible();
      await expect.poll(() => saveBar.evaluate(element => getComputedStyle(element).position)).toBe('sticky');
      const saveBox = await page.getByRole('button', { name: '저장하기' }).boundingBox();
      expect(saveBox).not.toBeNull();
      expect(saveBox!.x).toBeGreaterThanOrEqual(19);
      expect(saveBox!.x + saveBox!.width).toBeLessThanOrEqual(width - 19);
      expect(saveBox!.y + saveBox!.height).toBeLessThanOrEqual(740);
    }
  }

  let logoutRequested = false;
  await page.route('**/api/auth/logout', route => {
    logoutRequested = true;
    loggedIn = false;
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ ok: true }) });
  });
  await page.goto('/settings/profile');
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: '로그아웃' }).click();
  await expect(page).toHaveURL(/\/settings$/);
  expect(logoutRequested).toBe(true);
  await expect(page.getByTestId('settings-login-card')).toBeVisible();
  await expect(page.getByTestId('settings-profile-summary')).toHaveCount(0);
  await expect(page.getByText('로그인 및 보안')).toHaveCount(0);
  await expect(page.getByText('로그아웃되었습니다')).toBeVisible();
});

test('profile create action enters the existing Google auth boundary', async ({ page }) => {
  let authStartUrl = '';
  await mockDiscoveryApi(page);
  await page.route('**/api/auth/google/start**', async route => {
    authStartUrl = route.request().url();
    await route.fulfill({ contentType: 'text/html', body: '<h1>Google login boundary</h1>' });
  });

  await page.goto('/profile');
  await page.getByRole('button', { name: '로그인하고 게시물 작성' }).click();

  await expect(page.getByRole('heading', { name: 'Google login boundary' })).toBeVisible();
  expect(new URL(authStartUrl).searchParams.get('next')).toBe('/coursemap/new');
});

test('saved restaurants and multi-stop items share one course model', async ({ page }) => {
  const restaurant = {
    id: 'restaurant-1', name: '통합 식당', category: '한식', photos: [],
    rating: 4.5, reviewCount: 20, priceLevel: 2, address: 'Melbourne VIC',
    description: '', tags: ['한식'], dietary: [], menuItems: [], phone: null,
    openHours: '', latitude: -37.81, longitude: 144.96,
  };
  const stop = {
    placeId: restaurant.id, order: 1, startTime: '', endTime: '',
    isBookmarked: false, restaurant,
  };
  const savedCourse = {
    id: 'saved-course-1', title: '오늘의 한 곳 코스', description: '통합 저장 테스트',
    heroImage: '', tags: ['맛집'], hashtags: [], region: 'Melbourne',
    metadata: { distance: 0, duration: 0, placeCount: 1 }, creatorId: 'course-author',
    savedCount: 1, isPublic: true, createdAt: new Date().toISOString(), stops: [stop],
  };
  const savedPost = {
    id: 'post_saved-course-1', courseId: savedCourse.id, creatorId: 'course-author',
    authorName: '코스 작성자', authorImage: null, title: savedCourse.title,
    description: savedCourse.description, heroImage: '', photos: [], decor: [],
    templateId: null, tags: savedCourse.tags, stops: [stop], likesCount: 0,
    savesCount: 1, commentsCount: 0, comments: [], createdAt: savedCourse.createdAt,
  };
  await page.route('**/api/auth/session', route => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({
      user: { sub: 'saved-viewer', name: '저장 사용자', email: 'saved@example.com' },
      profile: { id: 'saved-viewer', username: '저장 사용자', handle: 'saved', profile_image_url: null },
    }),
  }));
  await page.route('**/api/feed**', route => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({ items: [], nextCursor: null, hasMore: false }),
  }));
  await page.route('**/api/restaurants**', route => route.fulfill({ contentType: 'application/json', body: '[]' }));
  await page.route('**/api/courses**', route => route.fulfill({ contentType: 'application/json', body: '[]' }));
  await page.route('**/api/saved-courses**', route => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({
      courseIds: [savedCourse.id],
      items: [{ courseId: savedCourse.id, savedAt: new Date().toISOString(), course: savedCourse, post: savedPost }],
    }),
  }));

  await page.goto('/saved?tab=restaurants');

  await expect(page.getByRole('textbox', { name: '저장 코스 검색' })).toBeVisible();
  await expect(page.getByRole('group', { name: '저장 항목 필터' })).toHaveCount(0);
  await expect(page.getByText('통합 식당')).toBeVisible();
  await expect(page.getByText('1곳 코스').first()).toBeVisible();
  await expect(page.getByText('Munchie 먼치픽')).toHaveCount(0);
  await expect(page.getByText('Lunchie 런치픽')).toHaveCount(0);

  await page.goto(`/course/${savedCourse.id}?from=saved&post=${savedPost.id}`);
  await page.getByRole('button', { name: '방문 일지 만들기' }).click();

  await expect(page).toHaveURL(/\/coursemap\/new\?course=saved-course-1$/);
  await expect(page.getByText('코스맵을 정하세요')).toBeVisible();
  await expect(page.getByText('통합 식당').first()).toBeVisible();
});


test('avatar editing lives only in Settings and reuses upload and profile persistence', async ({ page }) => {
  await mockDiscoveryApi(page);
  let avatarUrl: string | null = null;
  const photo = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=';
  await page.route('**/api/auth/session', route => route.fulfill({ json: {
    user: { sub: 'avatar-user', name: 'Avatar User', email: 'avatar@example.com' },
    profile: { id: 'avatar-user', username: 'Avatar User', handle: 'avatar_user', profile_image_url: avatarUrl },
  } }));
  await page.route('**/api/uploads', async route => {
    expect(route.request().method()).toBe('POST');
    expect(route.request().postDataJSON().dataUrl).toMatch(/^data:image\//);
    await route.fulfill({ json: { url: photo } });
  });
  await page.route('**/api/profile', async route => {
    expect(route.request().method()).toBe('PATCH');
    avatarUrl = route.request().postDataJSON().avatarUrl;
    await route.fulfill({ json: { profile: { profile_image_url: avatarUrl } } });
  });
  await page.goto('/profile?avatar=edit');
  await expect(page.getByRole('button', { name: '프로필 설정' })).toBeVisible();
  await expect(page.getByRole('button', { name: '아바타 변경' })).toHaveCount(0);
  await expect(page.locator('input[type=file]')).toHaveCount(0);
  await expect(page.getByText('아바타 변경', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: '프로필 설정' }).click();
  await page.getByTestId('settings-profile-summary').click();
  await page.getByRole('button', { name: '사진 변경', exact: true }).click();
  await page.locator('input[type=file]').setInputFiles({ name: 'avatar.png', mimeType: 'image/png', buffer: Buffer.from(photo.split(',')[1], 'base64') });
  await expect(page.getByTestId('profile-edit-avatar-preview').locator('img')).toHaveAttribute('src', photo);
  await page.reload();
  await expect(page.getByTestId('profile-edit-avatar-preview').locator('img')).toHaveAttribute('src', photo);
  await page.getByRole('button', { name: '사진 변경', exact: true }).click();
  await page.getByRole('button', { name: '사진 삭제하고 이모지로' }).click();
  await expect.poll(() => avatarUrl).toBeNull();
  await expect(page.getByTestId('profile-edit-avatar-preview').locator('img')).toHaveCount(0);
});
