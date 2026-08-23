import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(new URL('./LunchieSwipePage.tsx', import.meta.url), 'utf8');
const imageSource = readFileSync(new URL('../components/FoodImage.tsx', import.meta.url), 'utf8');
const contextSource = readFileSync(new URL('../contexts/AppContext.tsx', import.meta.url), 'utf8');

describe('Lunchie swipe photo recovery', () => {
  it('uses canonical photos before a legacy card image', () => {
    expect(source).toContain('src={foodPhotos[0] || restaurant.image}');
    expect(source).toContain('fallbackImage={foodPhotos[0] || restaurant.image}');
  });

  it('recovers when a hydrated image source replaces a failed legacy URL', () => {
    expect(imageSource).toContain('useEffect(() => { setFailed(false); }, [src])');
    expect(contextSource).toContain('catalogueById');
    expect(contextSource).toContain('image: photos[0]');
  });
});
