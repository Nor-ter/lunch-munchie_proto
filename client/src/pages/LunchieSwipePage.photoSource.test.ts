import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(new URL('./LunchieSwipePage.tsx', import.meta.url), 'utf8');
const imageSource = readFileSync(new URL('../components/FoodImage.tsx', import.meta.url), 'utf8');
const contextSource = readFileSync(new URL('../contexts/AppContext.tsx', import.meta.url), 'utf8');

describe('Lunchie swipe photo recovery', () => {
  it('never revives a legacy image after the server supplied a canonical photo list', () => {
    expect(source).toContain('const primaryPhoto = hasCanonicalPhotoList ? foodPhotos[0] : restaurant.image');
    expect(source).toContain('src={primaryPhoto}');
    expect(source).toContain('fallbackImage={primaryPhoto}');
  });

  it('recovers when a hydrated image source replaces a failed legacy URL', () => {
    expect(imageSource).toContain('useEffect(() => { setFailed(false); }, [src])');
    expect(imageSource).toContain('onLoadError?.(src)');
    expect(source).toContain('onLoadError={markPhotoFailed}');
    expect(source).toContain('onPhotoError={markPhotoFailed}');
    expect(source).toContain('failedPhotoSources.has(photo)');
    expect(contextSource).toContain('catalogueById');
    expect(contextSource).toContain("const image = photos[0] ?? ''");
  });

  it('keeps menu photo progress explicit and separate from restaurant-card progress', () => {
    expect(source).toContain("? '등록된 음식 사진이 없어요'");
    expect(source).toContain('`메뉴 사진 ${photoIndex + 1} / ${foodPhotos.length}`');
    expect(source).toContain('`메뉴 사진 전체 ${foodPhotos.length}장 중 ${photoIndex + 1}번째`');
    expect(source).not.toContain('`메뉴 ${photoIndex + 1}`');
    expect(source).toContain('aria-label="이전 사진"');
    expect(source).toContain('aria-label="다음 사진"');
    expect(source).toContain("? '← 이전 / 다음 사진 →'");
    expect(source).toContain('foodPhotos.length > 0 ? (');
  });
});
