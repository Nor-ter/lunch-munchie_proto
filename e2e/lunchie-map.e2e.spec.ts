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

test('saved Lunchie restaurant renders a full-height map and marker', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route('https://fonts.googleapis.com/**', route => route.fulfill({
    status: 200,
    contentType: 'text/css',
    body: '',
  }));
  await page.route('https://*.tile.openstreetmap.org/**', route => route.fulfill({
    status: 200,
    contentType: 'image/svg+xml',
    body: '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="256" height="256" fill="#efe9df"/><path d="M-20 180L280 40M-20 220L280 80" stroke="#fff" stroke-width="18"/><path d="M120-20L150 280" stroke="#d8cfc3" stroke-width="8"/></svg>',
  }));
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname;
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
  const map = region.locator('.leaflet-container');
  await expect(map).toBeVisible();
  await expect(map.locator('.leaflet-marker-icon')).toBeVisible();
  await expect(map.locator('.leaflet-tile-loaded').first()).toBeVisible();

  const [regionBox, mapBox] = await Promise.all([region.boundingBox(), map.boundingBox()]);
  expect(regionBox!.height).toBeGreaterThan(400);
  expect(mapBox!.height).toBeGreaterThanOrEqual(regionBox!.height - 1);
  expect(mapBox!.width).toBeGreaterThanOrEqual(regionBox!.width - 1);
});
