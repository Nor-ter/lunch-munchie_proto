/** Sample food/menu photo references, keyed by restaurant category — used for the
 * tap-to-reveal menu panel and winner share card. */
export const FOOD_PHOTOS: Record<string, string[]> = {
  '카페': [
    'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&q=80',
    'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400&q=80',
    'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=400&q=80',
    'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=400&q=80',
  ],
  '베이커리': [
    'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400&q=80',
    'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&q=80',
    'https://images.unsplash.com/photo-1586985289688-ca3cf47d3e6e?w=400&q=80',
    'https://images.unsplash.com/photo-1517433367423-c7e5b0f35086?w=400&q=80',
  ],
  '이탈리안': [
    'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400&q=80',
    'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=400&q=80',
    'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=400&q=80',
    'https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=400&q=80',
  ],
  '일식': [
    'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=400&q=80',
    'https://images.unsplash.com/photo-1569050467447-ce54b3bbc37d?w=400&q=80',
    'https://images.unsplash.com/photo-1611143669185-af224c5e3252?w=400&q=80',
    'https://images.unsplash.com/photo-1617196034183-421b4040ed20?w=400&q=80',
  ],
  '중식': [
    'https://images.unsplash.com/photo-1569050467447-ce54b3bbc37d?w=400&q=80',
    'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=400&q=80',
    'https://images.unsplash.com/photo-1606756790138-261d2b21cd75?w=400&q=80',
    'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=400&q=80',
  ],
  'default': [
    'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&q=80',
    'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400&q=80',
    'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=400&q=80',
    'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&q=80',
  ],
};

export function getFoodPhotos(category: string): string[] {
  return FOOD_PHOTOS[category] || FOOD_PHOTOS['default'];
}
