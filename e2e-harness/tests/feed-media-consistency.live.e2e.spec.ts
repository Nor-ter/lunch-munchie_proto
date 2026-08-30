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
  const feed = await response.json() as Array<{
    id: string;
    courseId: string;
    templateId?: string;
    photos: string[];
    decor: unknown[];
    storySlides?: Array<{ photo: string }>;
  }>;
  const post = feed.find(item => (
    item.templateId
    && item.photos.length > 0
    && item.decor.length > 0
    && (item.storySlides?.length ?? 0) > 0
  ));
  test.skip(!post, 'a server-persisted story post is required for this live contract');
  if (!post?.templateId) return;

  const expected = [...new Set(post.photos)].sort();
  const expectedStoryOrder = post.storySlides!.map(slide => slide.photo);
  await page.goto(`/feed/${post.id}`, { waitUntil: 'networkidle' });
  const card = page.getByTestId(`unified-munchie-card-${post.id}`);
  await expect(card).toBeVisible();
  const carousel = card.locator('[data-ui="munchie-food-hero"]');
  for (let index = 0; index < expectedStoryOrder.length; index += 1) {
    await expect(carousel).toHaveAttribute('data-slide-index', String(index));
    await expect(carousel.locator('img')).toHaveAttribute('src', expectedStoryOrder[index]!);
    if (index < expectedStoryOrder.length - 1) {
      await card.getByRole('button', { name: '다음 음식 사진' }).click();
    }
  }

  await page.goto(`/template/${post.templateId}?course=${post.courseId}&from=feed`, { waitUntil: 'networkidle' });
  await expect(uploadedSources(page.locator('img'))).resolves.toEqual(expected);
});
