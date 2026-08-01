import { expect, test } from 'playwright/test';

function uploadedSources(locator: import('playwright/test').Locator) {
  return locator.evaluateAll(images => [...new Set(images
    .map(image => image.getAttribute('src') || '')
    .filter(source => source.includes('/photos/uploads/')),
  )].sort());
}

test('feed detail and template detail render the post owner media exactly', async ({ page, request }) => {
  const response = await request.get('/api/feed');
  expect(response.ok()).toBeTruthy();
  const feed = await response.json() as Array<{ id: string; courseId: string; templateId?: string; photos: string[]; decor: unknown[] }>;
  const post = feed.find(item => item.templateId && item.photos.length > 0 && item.decor.length > 0);
  expect(post, 'a server-persisted media post is required for this live contract').toBeTruthy();
  if (!post?.templateId) return;

  const expected = [...new Set(post.photos)].sort();
  await page.goto(`/feed/${post.id}`, { waitUntil: 'networkidle' });
  await expect(page.getByTestId(`unified-munchie-card-${post.id}`)).toBeVisible();
  await expect(uploadedSources(page.getByTestId(`unified-munchie-card-${post.id}`).locator('img'))).resolves.toEqual(expected);

  await page.goto(`/template/${post.templateId}?course=${post.courseId}&from=feed`, { waitUntil: 'networkidle' });
  await expect(uploadedSources(page.locator('img'))).resolves.toEqual(expected);
});
