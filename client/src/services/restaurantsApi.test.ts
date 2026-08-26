import { describe, expect, it, vi } from 'vitest';
import { getRestaurantById } from './restaurantsApi';

describe('getRestaurantById', () => {
  it('loads a persisted lunch pick by its exact encoded id', async () => {
    const request = vi.fn(async () => Response.json({
      id: 'osm_node_622311421',
      name: 'Pho La Que Basil Leaf',
      category: 'Vietnamese',
      address: '369 Brunswick Street Fitzroy 3065',
      latitude: -37.796131,
      longitude: 144.978655,
      rating: 4.2,
      review_count: 12,
      price_level: 2,
      phone_number: '+61 3 9000 0000',
      tags: ['restaurant', 'vietnamese'],
      photos: [],
      menu_items: [],
      dietary_options: [],
    }));

    await expect(getRestaurantById('osm_node_622311421', request)).resolves.toMatchObject({
      id: 'osm_node_622311421',
      lat: -37.796131,
      lng: 144.978655,
      phone: '+61 3 9000 0000',
    });
    expect(request).toHaveBeenCalledWith('/api/restaurants/osm_node_622311421', {
      credentials: 'same-origin',
    });
  });

  it('returns null for a deleted lunch pick', async () => {
    const request = vi.fn(async () => new Response(null, { status: 404 }));
    await expect(getRestaurantById('missing', request)).resolves.toBeNull();
  });
});
