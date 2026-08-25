import { expect, test, type Route } from 'playwright/test';

const metrics = {
  days: 30, updatedAt: new Date().toISOString(),
  users: { registered: 0, newRegistered: 0, activeSignedIn: 0, activeGuests: 0, activeActors: 0 },
  funnel: { impressions: 0, swipes: 0, likes: 0, nopes: 0, decisions: 0, navigations: 0, rerolls: 0, abandons: 0 },
  quality: { swipeLikeRate: null, sessionDecisionRate: null, rerollRate: null, propensityCoverage: null, scoreCoverage: null },
  trend: [], personas: [], models: [], categoryPerformance: [], policyContributions: [], contributionSampleSize: 0,
  instrumentation: { persistedSlates: 0, servedImpressions: 0, attributableSwipes: 0, persistedSessionSwipes: 0, attributableSessionSwipes: 0, unattributedSessionSwipes: 0, propensityCoverage: null, scoreCoverage: null, modelVersionCoverage: null, contextCoverage: null },
  learning: { level: 'blocked', label: '준비 중', detail: '', nextStep: '', targets: { swipes: 50, decisions: 20 } },
  catalogue: {
    restaurants: 1, photoReferences: 1, restaurantsWithPhotoReferences: 1, photoAssets: 1, restaurantsWithPhotoAssets: 1,
    communityPhotoAttributions: 0, restaurantPhotoAttributions: 0, otherPhotoAttributions: 0, menuItems: 0,
    restaurantsWithMenus: 0, normalisedMenuItems: 0, restaurantsWithNormalisedMenus: 0, pricedMenuItems: 0,
    dietaryMenuItems: 0, evidencedMenuItems: 0,
    completeness: { address: 1, coordinates: 1, description: 1, photoReference: 1, menu: 0 },
    categories: [], dietarySupport: [], menuIntentEvidence: [{ intent: 'meal', count: 0 }, { intent: 'cafe', count: 0 }, { intent: 'dessert', count: 0 }], sources: [], samples: [],
  },
};

const photos = {
  photos: [{
    id: 'photo-1', restaurantId: 'restaurant-1', restaurantName: 'Test Kitchen', restaurantCategory: '한식',
    restaurantAddress: 'Melbourne', url: '/photos/test/food.jpg', r2Key: 'test/food.jpg', kind: 'dish',
    dishes: ['비빔밥'], vibeTags: [], quality: 0.9, hasPerson: false, source: 'drive', reviewStatus: 'pending',
    reviewNotes: null, reviewedAt: null,
  }],
  summary: {
    all: { photos: 1, restaurants: 1 }, pending: { photos: 1, restaurants: 1 },
    approved: { photos: 0, restaurants: 0 }, rejected: { photos: 0, restaurants: 0 },
  },
  readinessSummary: {
    restaurants: 1, eligibleRestaurants: 0, insufficientRestaurants: 1, noSafePhotos: 0,
    oneSafePhoto: 1, minimumDistinctPhotos: 2,
  },
  restaurantMedia: { 'restaurant-1': { totalPhotos: 1, distinctSafePhotos: 1, eligible: false } },
  pagination: { total: 1, limit: 24, offset: 0, hasMore: false },
};

test('admin can review restaurant images from a grouped, paginated gallery', async ({ page }) => {
  let update: Record<string, unknown> | null = null;
  await page.route('**/api/admin/metrics*', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify(metrics) }));
  const handlePhotoApi = async (route: Route) => {
    if (route.request().method() === 'PATCH') {
      update = route.request().postDataJSON() as Record<string, unknown>;
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ ok: true }) });
      return;
    }
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify(photos) });
  };
  await page.route('**/api/admin/photos?*', handlePhotoApi);
  await page.route('**/api/admin/photos/*', handlePhotoApi);
  await page.route('**/photos/test/food.jpg', route => route.fulfill({ status: 200, contentType: 'image/gif', body: Buffer.from('R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==', 'base64') }));

  await page.goto('/admin');
  await expect(page.getByRole('heading', { name: '식당 이미지 검수' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Test Kitchen' })).toBeVisible();
  await expect(page.getByText('추천용 사진 보강 필요')).toBeVisible();
  await expect(page.getByText('원본 1장')).toBeVisible();
  await expect(page.getByText('추천용 서로 다른 사진 1장 · 최소 2장')).toBeVisible();
  await expect(page.getByText('검수 대기').first()).toBeVisible();

  await page.getByRole('article').getByRole('button', { name: '승인' }).click();
  await expect.poll(() => update).toMatchObject({ reviewStatus: 'approved', kind: 'dish', hasPerson: false, quality: 0.9 });
});
