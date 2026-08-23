import { expect, test } from 'playwright/test';

const restaurant = {
  id: 'osm_node_622311421',
  name: 'Pho La Que Basil Leaf',
  category: 'Vietnamese',
  address: '369 Brunswick Street Fitzroy 3065',
  latitude: -37.796131,
  longitude: 144.978655,
  rating: 4.2,
  review_count: 12,
  price_level: 2,
  tags: ['restaurant', 'vietnamese'],
  photos: [],
  menu_items: [],
  dietary_options: [],
};

test('saved Lunchie restaurant uses Google Maps and returns to the Lunchie tab', async ({ page }) => {
  let googleMapsLoaderRequested = false;
  let openStreetMapRequested = false;
  page.on('request', request => {
    const url = request.url();
    if (url.includes('maps.googleapis.com/maps/api/')) googleMapsLoaderRequested = true;
    if (url.includes('openstreetmap.org')) openStreetMapRequested = true;
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route('https://fonts.googleapis.com/**', route => route.fulfill({
    status: 200,
    contentType: 'text/css',
    body: '',
  }));
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname;
    // Google Maps also loads from a `/maps/api/...` URL. Only mock this app's
    // own API namespace so the real map loader can initialise in this test.
    if (!path.startsWith('/api/')) {
      await route.continue();
      return;
    }
    if (path === `/api/restaurants/${restaurant.id}`) {
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify(restaurant) });
      return;
    }
    if (path === '/api/auth/session') {
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ user: null }) });
      return;
    }
    if (path === '/api/restaurants' || path === '/api/courses' || path === '/api/feed') {
      await route.fulfill({ contentType: 'application/json', body: '[]' });
      return;
    }
    await route.fulfill({ contentType: 'application/json', body: '{}' });
  });

  await page.goto(`/lunchie/map?id=${restaurant.id}`);

  await expect(page.getByText(restaurant.name, { exact: true })).toBeVisible();
  await expect(page.getByText(restaurant.address, { exact: true })).toBeVisible();
  const region = page.locator('[data-ui="lunchie-restaurant-map"]');
  const map = region.locator('.gm-style');
  await expect(map).toBeVisible();

  const [regionBox, mapBox] = await Promise.all([region.boundingBox(), map.boundingBox()]);
  expect(regionBox!.height).toBeGreaterThan(400);
  expect(mapBox!.height).toBeGreaterThanOrEqual(regionBox!.height - 1);
  expect(mapBox!.width).toBeGreaterThanOrEqual(regionBox!.width - 1);
  expect(googleMapsLoaderRequested).toBe(true);
  expect(openStreetMapRequested).toBe(false);

  await page.getByRole('button', { name: 'Lunchie 런치픽으로 돌아가기' }).click();
  await expect(page).toHaveURL('/saved?tab=restaurants');
  await expect(page.getByRole('button', { name: /Lunchie 런치픽/ })).toHaveAttribute('aria-pressed', 'true');
});
