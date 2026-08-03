export interface User {
  id: string;
  username: string;
  profile_image_url: string | null;
  bio: string | null;
  location: string | null;
  created_at: string;
}

export interface UserFollow {
  id: string;
  follower_id: string;
  following_id: string;
  created_at: string;
}

/**
 * D1 `restaurants` 테이블 행 — Places API가 그대로 돌려주는
 * 실제 DB row(snake_case). 원본: mobile/types/db.ts Restaurant
 * (web-maps-places-workflow.md Phase 1 이식).
 *
 * ⚠️ AppContext.tsx 의 `Restaurant`(카멜케이스 mock/코스 로컬 모델)와는 다른 타입이다 —
 * 이름 충돌을 피하려고 `GoogleRestaurantRow`로 명명. Phase 3(PlaceExplorePage)에서
 * 코스에 추가할 때 AppContext.Restaurant 형태로 매핑한다.
 */
export interface GoogleRestaurantRow {
  id: string;
  name: string;
  category: string;
  address: string;
  latitude: number;
  longitude: number;
  rating: number; // NOT NULL — Google 미제공 시 프록시가 0 으로 채움
  review_count: number;
  price_level: number; // NOT NULL — Google 미제공 시 프록시가 2 로 채움
  short_description: string | null;
  tags: string[] | null;
  dietary_options: string[] | null;
  photos: string[] | null;
  menu_items: { name: string; price: number }[] | null;
  phone_number: string | null;
  business_hours: string | null;
  // ── Google 브릿지 컬럼 ──
  google_place_id: string | null;
  synced_at: string | null;
  source: 'seed' | 'google';
}
