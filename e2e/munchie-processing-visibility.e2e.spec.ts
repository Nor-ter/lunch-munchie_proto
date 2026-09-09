import { expect, test, type Page } from 'playwright/test';
import { resolve } from 'node:path';

const appOrigin = process.env.MUNCHIE_E2E_ORIGIN ?? '';
const FOOD_IMAGE_PATH = resolve('client/public/templates4_3/munchie-01.png');

async function mockAnonymousSession(page: Page, modelDelayMs = 1_500) {
  await page.route('**/api/auth/session', route => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({ user: null, profile: null }),
  }));
  await page.route('**/api/restaurants', route => route.fulfill({
    contentType: 'application/json', body: '[]',
  }));
  await page.route('**/api/courses', route => route.fulfill({
    contentType: 'application/json', body: '[]',
  }));
  await page.route('**/api/feed**', route => route.fulfill({
    contentType: 'application/json', body: JSON.stringify({ items: [], nextCursor: null }),
  }));
  await page.route(/(vision_bundle.*\.js|@mediapipe_tasks-vision\.js)/, async route => {
    await new Promise(resolve => setTimeout(resolve, modelDelayMs));
    await route.abort();
  });
}

for (const route of ['/profile/munchie-tank', '/prototype/munchie-capture']) {
  test(`${route} mounts visible static processing content before segmentation`, async ({ page }) => {
    await mockAnonymousSession(page);
    await page.goto(`${appOrigin}${route}`);

    await page.evaluate(() => {
      const state = window as typeof window & {
        __munchieProcessingFirstMount?: Promise<{
          opacity: string;
          visibility: string;
          text: string;
        }>;
      };
      state.__munchieProcessingFirstMount = new Promise(resolve => {
        const observer = new MutationObserver(() => {
          const processing = document.querySelector<HTMLElement>('[data-testid="munchie-processing"]');
          if (!processing) return;
          const style = getComputedStyle(processing);
          resolve({
            opacity: style.opacity,
            visibility: style.visibility,
            text: processing.textContent ?? '',
          });
          observer.disconnect();
        });
        observer.observe(document.documentElement, { childList: true, subtree: true });
      });
    });

    await page.locator('input[type="file"]').setInputFiles(FOOD_IMAGE_PATH);

    const firstMount = await page.evaluate(() => {
      const state = window as typeof window & {
        __munchieProcessingFirstMount?: Promise<{
          opacity: string;
          visibility: string;
          text: string;
        }>;
      };
      return state.__munchieProcessingFirstMount;
    });
    expect(firstMount?.opacity).toBe('1');
    expect(firstMount?.visibility).not.toBe('hidden');
    expect(firstMount?.text).toContain('Munchie를 만들고 있어요');

    const processing = page.getByTestId('munchie-processing');
    await expect(processing).toBeVisible();
    await expect(processing.getByText('Munchie를 만들고 있어요 ✨', { exact: false })).toBeVisible();
    await expect(processing.getByText('음식에서 Munchie를 쏙 꺼내는 중이에요')).toBeVisible();

    const opacity = await processing.evaluate(element => getComputedStyle(element).opacity);
    const visibility = await processing.evaluate(element => getComputedStyle(element).visibility);
    const bounds = await processing.boundingBox();
    expect(opacity).not.toBe('0');
    expect(visibility).not.toBe('hidden');
    expect(bounds?.width ?? 0).toBeGreaterThan(0);
    expect(bounds?.height ?? 0).toBeGreaterThan(0);
  });
}

test('/profile/munchie-tank keeps the same preview through the secondary loading message', async ({ page }) => {
  await mockAnonymousSession(page, 6_000);
  await page.goto(`${appOrigin}/profile/munchie-tank`);

  await page.locator('input[type="file"]').setInputFiles(FOOD_IMAGE_PATH);

  const processing = page.getByTestId('munchie-processing');
  const preview = processing.getByRole('img', { name: '선택한 음식' });
  await expect(preview).toBeVisible();
  const initialSource = await preview.getAttribute('src');
  expect(initialSource).toMatch(/^blob:/);
  await expect(preview).toHaveJSProperty('complete', true);
  expect(await preview.evaluate(image => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);

  await expect(processing.getByText('조금만 기다려주세요 🍽️')).toBeVisible({ timeout: 20_000 });
  await expect(processing.getByText('Munchie를 예쁘게 다듬고 있어요')).toBeVisible();
  await expect(preview).toBeVisible();
  await expect(preview).toHaveAttribute('src', initialSource!);
  await expect(preview).toHaveJSProperty('complete', true);
  expect(await preview.evaluate(image => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);

  await expect(page.getByText('음식이나 접시의 가운데를 톡 눌러주세요')).toBeVisible({ timeout: 10_000 });
  await expect(processing).not.toBeAttached();

  await page.getByRole('button', { name: '원본 사진으로 담기' }).click();
  await expect(page.getByText('Munchie 1', { exact: true })).toBeVisible({ timeout: 10_000 });
});
