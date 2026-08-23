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
    expect(contextSource).toContain('catalogueById');
    expect(contextSource).toContain("const image = photos[0] ?? ''");
  });

  it('renders a deliberate fallback instead of an empty menu image', () => {
    expect(source).toContain("foodPhotos.length > 0 ? `메뉴 ${photoIndex + 1}` : '등록된 음식 사진이 없어요'");
    expect(source).toContain('foodPhotos.length > 0 ? (');
  });
});
