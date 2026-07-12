/**
 * types/db.ts — 실제 Supabase 스키마 기준 행(row) 타입 (Phase 0)
 *
 * 워크플로우 §3.1의 운영 DB 스키마를 그대로 반영한다. supabase-js/PostgREST 는
 * 컬럼명을 snake_case 그대로, timestamp/timestamptz 는 ISO 문자열로 반환한다.
 *
 * 참고: 기존 types/course.ts 는 웹 프로토타입 UI 용 목 타입(CoursePlace / 프로토타입
 * Course 등, 현재 7개 파일이 의존)이라 덮어쓰지 않고 여기 DB 행 타입을 분리했다.
 * Phase 1에서 실데이터로 화면을 배선하며 UI 타입을 이 DB 타입으로 수렴시킨다.
 * (shared/schema.ts 의 Drizzle 정의와 1:1 동기화 — 컬럼 추가 시 양쪽 함께 수정)
 */

/** courses 테이블 한 행 */
export interface Course {
  id: string;
  author_id: string;
  title: string;
  description: string;
  hero_image: string;
  category: string;
  region: string;
  tags: string[] | null;
  hashtags: string[] | null;
  total_distance: number;
  total_duration: number;
  likes_count: number;
  saves_count: number;
  comments_count: number;
  route_polyline: string | null;
  share_image_url: string | null;
  is_public: boolean;
  created_at: string; // ISO timestamp
}

/** course_items 테이블 한 행 (코스 안의 stop 하나) */
export interface CourseItem {
  id: string;
  course_id: string;
  restaurant_id: string;
  order_index: number; // 정렬 순서 (커밋 시 0..n-1 로 정규화 · §3.3)
  start_time: string | null;
  end_time: string | null;
  is_bookmarked: boolean;
  memo: string | null;
  created_at: string; // ISO timestamp
}

/** restaurants 테이블 한 행 (source of truth · Google 브릿지 컬럼 포함) */
export interface Restaurant {
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
  // ── Google 브릿지 컬럼 (Phase 0 · additive) ──
  google_place_id: string | null; // Google place_id (중복제거/refresh 키)
  synced_at: string | null; // 마지막 Google 동기화 시각 (TTL 판정) · ISO timestamp
  source: 'seed' | 'google'; // NOT NULL default 'seed'
}

/**
 * course_items ⨝ restaurants 조인 결과.
 * §5 진입 흐름에서 stop 리스트를 이 형태로 조회하고, editStore 의 draft 단위로 쓴다.
 */
export interface CourseItemWithRestaurant extends CourseItem {
  restaurant: Restaurant;
}

/** users 테이블 한 행 (팔로우 기능 Phase 1 · follow-feature-workflow.md §1.1, §2) */
export interface User {
  id: string;
  username: string;
  profile_image_url: string | null;
  bio: string | null;
  location: string | null;
  created_at: string; // ISO timestamp
}

/** user_follows 테이블 한 행 (단방향 팔로우 관계 · follow-feature-workflow.md §1.1) */
export interface UserFollow {
  id: string;
  follower_id: string;
  following_id: string;
  created_at: string; // ISO timestamp
}
