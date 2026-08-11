import { describe, expect, it } from 'vitest';
import { suggestPhotoRestaurant } from './photoAttribution';

describe('suggestPhotoRestaurant', () => {
  const restaurants = [
    { id: 'near', name: 'Near', lat: -37.8136, lng: 144.9631 },
    { id: 'far', name: 'Far', lat: -37.824, lng: 144.98 },
  ];

  it('suggests only the closest course restaurant inside the conservative radius', () => {
    expect(suggestPhotoRestaurant({ latitude: -37.8137, longitude: 144.9632 }, restaurants)).toMatchObject({
      restaurantId: 'near',
    });
  });

  it('does not guess a restaurant when photo GPS is outside the radius', () => {
    expect(suggestPhotoRestaurant({ latitude: -37.8, longitude: 144.94 }, restaurants)).toBeNull();
  });
});
