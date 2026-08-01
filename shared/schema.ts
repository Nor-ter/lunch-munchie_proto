import { pgTable, text, integer, doublePrecision, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createSelectSchema, createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  username: text("username").notNull(),
  profile_image_url: text("profile_image_url"),
  bio: text("bio"),
  location: text("location"),
  created_at: timestamp("created_at").notNull(),
});

export const restaurants = pgTable("restaurants", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull().default("기타"),
  address: text("address").notNull(),
  latitude: doublePrecision("latitude").notNull(),
  longitude: doublePrecision("longitude").notNull(),
  rating: doublePrecision("rating").notNull(),
  review_count: integer("review_count").notNull().default(0),
  price_level: integer("price_level").notNull(),
  short_description: text("short_description"),
  tags: jsonb("tags").$type<string[]>(),
  dietary_options: jsonb("dietary_options").$type<string[]>(),
  photos: jsonb("photos").$type<string[]>(),
  
  // 1. 분위기 및 공간 태그 (기본적인 필터링 용도)
  vibe_tags: jsonb("vibe_tags").$type<string[]>(), 
  
  // 2. 비정형 시각적 메타데이터 (LLM 활용을 위한 자유 양식 텍스트)
  visual_description: text("visual_description"),
  
  // 3. menu_items 타입 구체화
  menu_items: jsonb("menu_items").$type<{
    name: string;
    price: number | null;
    image?: string;
    dietary?: string[];
    category?: string;
    description?: string;
    is_signature?: boolean;
  }[]>(), 
  
  phone_number: text("phone_number"),
  business_hours: text("business_hours"),
  website: text("website"), // 공식 웹사이트 (메뉴 스크랩 소스)
  // ── Google 브릿지 컬럼 (Phase 0 · additive) — supabase/migrations/20260705000000 과 동기화 ──
  google_place_id: text("google_place_id").unique(), // Google place_id (중복제거/refresh 키). nullable.
  synced_at: timestamp("synced_at", { withTimezone: true }), // 마지막 Google 동기화 시각 (TTL 판정)
  source: text("source").notNull().default("seed"), // 'seed' | 'google'
});

// 팔로우 기능 Phase 1 · follow-feature-workflow.md §1.1 — remote_schema.sql 과 1:1 동기화.
// FK 없음(프로젝트 전역 원칙 §3.4 계승) — 무결성은 앱 책임, 목록은 2쿼리 클라이언트 조인.
export const userFollows = pgTable("user_follows", {
  id: text("id").primaryKey(),
  follower_id: text("follower_id").notNull(),
  following_id: text("following_id").notNull(),
  created_at: timestamp("created_at").notNull(),
});

export const savedCourses = pgTable("saved_courses", {
  id: text("id").primaryKey(),
  user_id: text("user_id").notNull(),
  course_id: text("course_id").notNull(),
  created_at: timestamp("created_at").notNull(),
});

export const feedLikes = pgTable("feed_likes", {
  id: text("id").primaryKey(),
  user_id: text("user_id").notNull(),
  course_id: text("course_id").notNull(),
  created_at: timestamp("created_at").notNull(),
});

export const courses = pgTable("courses", {
  id: text("id").primaryKey(),
  author_id: text("author_id").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  hero_image: text("hero_image").notNull().default(""),
  category: text("category").notNull(),
  region: text("region").notNull().default(""),
  tags: jsonb("tags").$type<string[]>(),
  hashtags: jsonb("hashtags").$type<string[]>(),
  total_distance: doublePrecision("total_distance").notNull(),
  total_duration: integer("total_duration").notNull(),
  likes_count: integer("likes_count").notNull().default(0),
  saves_count: integer("saves_count").notNull().default(0),
  route_polyline: text("route_polyline"),
  share_image_url: text("share_image_url"),
  comments_count: integer("comments_count").notNull().default(0),
  is_public: boolean("is_public").notNull().default(true),
  created_at: timestamp("created_at").notNull(),
});

export const courseItems = pgTable("course_items", {
  id: text("id").primaryKey(),
  course_id: text("course_id").notNull(),
  restaurant_id: text("restaurant_id").notNull(),
  order_index: integer("order_index").notNull(),
  start_time: text("start_time"),
  end_time: text("end_time"),
  is_bookmarked: boolean("is_bookmarked").notNull().default(false),
  memo: text("memo"),
  created_at: timestamp("created_at").notNull(),
});

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  host_user_id: text("host_user_id").notNull(),
  share_token: text("share_token").notNull(),
  status: text("status").notNull(), // "WAITING", "SWIPING_1", "SWIPING_2", "COMPLETED"
  deadline_at: timestamp("deadline_at").notNull(),
  group_size: integer("group_size").notNull(),
  filter_distance: integer("filter_distance").notNull(),
  filter_budget: integer("filter_budget").notNull(),
  filter_min_rating: doublePrecision("filter_min_rating").notNull(),
  filter_dietary: jsonb("filter_dietary").$type<string[]>(),
  filter_vibe: jsonb("filter_vibe").$type<string[]>(),
  swipe_limit: integer("swipe_limit").notNull(),
  top_restaurant_ids: jsonb("top_restaurant_ids").$type<string[]>(),
  final_restaurant_id: text("final_restaurant_id"),
  created_at: timestamp("created_at").notNull(),
});

export const swipes = pgTable("swipes", {
  id: text("id").primaryKey(),
  session_id: text("session_id").notNull(),
  user_id: text("user_id").notNull(),
  restaurant_id: text("restaurant_id").notNull(),
  round: integer("round").notNull(),
  swipe_action: text("swipe_action").notNull(), // "LIKE", "DISLIKE"
  created_at: timestamp("created_at").notNull(),
});

export const sessionMembers = pgTable("session_members", {
  id: text("id").primaryKey(),
  session_id: text("session_id").notNull(),
  user_id: text("user_id").notNull(),
  user_name: text("user_name").notNull(),
  emoji: text("emoji").notNull(),
  is_ready: boolean("is_ready").notNull().default(false),
  created_at: timestamp("created_at").notNull(),
});

// 런치 엔진 v0 — 추천 이벤트 로그 (로깅 + propensity, off-policy 평가 기반)
export const recEvents = pgTable("rec_events", {
  id: text("id").primaryKey(),
  event_type: text("event_type").notNull(), // IMPRESSION | SWIPE | WINNER | NAVIGATE | VISIT | REORDER | COURSE_SAVE | COURSE_EDIT | REROLL | FEED_LIKE | FEED_DISLIKE | COURSE_OPEN
  slate_id: text("slate_id"),               // 같은 추천 호출/대결을 묶음 (off-policy·pairwise 기준)
  slate_type: text("slate_type"),           // PRELIM | FINAL | NEXT_STOP | COURSE_FEED
  user_id: text("user_id"),
  course_id: text("course_id"),             // Munchie 피드 코스 ID
  session_id: text("session_id"),
  group_id: text("group_id"),
  restaurant_id: text("restaurant_id"),
  round: integer("round"),
  position: integer("position"),
  action: text("action"),
  propensity: doublePrecision("propensity"), // 정책이 이 아이템을 보여줄 확률
  score: doublePrecision("score"),
  model_version: text("model_version"),
  variant: text("variant"),
  dwell_ms: integer("dwell_ms"),
  context: jsonb("context").$type<Record<string, unknown>>(),
  created_at: timestamp("created_at").notNull(),
});

// ── 사진 인제스천 + 피처 스토어 (콜드스타트 해소) ──────────────────────────
// 마이그레이션: supabase/migrations/20260629000000_photo_ingest_and_features.sql
// 설계: docs/superpowers/specs/2026-06-29-drive-photo-ingestion.md
// 사진 바이너리는 저장하지 않고 Drive file_id/URL만. 메뉴판 사진은 여기 넣지 않는다(정보만 추출).

export const restaurantPhotos = pgTable("restaurant_photos", {
  id: text("id").primaryKey(),
  restaurant_id: text("restaurant_id").notNull(),
  drive_file_id: text("drive_file_id"),
  url: text("url"),
  kind: text("kind").notNull(), // storefront | interior | dish | table | other  (menu 제외)
  dishes: jsonb("dishes").$type<string[]>(),
  vibe_tags: jsonb("vibe_tags").$type<string[]>(),
  quality: doublePrecision("quality"),
  contributor: text("contributor"),
  source: text("source").notNull().default("drive"),
  created_at: timestamp("created_at").notNull(),
});

export const restaurantMenuItems = pgTable("restaurant_menu_items", {
  id: text("id").primaryKey(),
  restaurant_id: text("restaurant_id").notNull(),
  name: text("name").notNull(),
  normalized_name: text("normalized_name").notNull(), // 중복 판정 키
  price: doublePrecision("price"), // 미표기면 null
  currency: text("currency").notNull().default("AUD"),
  category: text("category"), // 메뉴판 섹션 헤더
  description: text("description"),
  dietary: jsonb("dietary").$type<string[]>(),
  source: text("source").notNull(), // website | drive_photo | manual
  confidence: doublePrecision("confidence"),
  is_signature: boolean("is_signature").notNull().default(false),
  extracted_at: timestamp("extracted_at").notNull(),
});

// ★ 콜드스타트 해소 지점 — features.ts buildItemVector 가 우선 조회, 없으면 카테고리 룰 폴백
export const restaurantFeatures = pgTable("restaurant_features", {
  restaurant_id: text("restaurant_id").primaryKey(),
  taste: jsonb("taste").$type<{ spicy: number; salty: number; sweet: number; oily: number; light: number }>(),
  price_stats: jsonb("price_stats").$type<{ min: number; max: number; median: number; n: number }>(),
  signature_dishes: jsonb("signature_dishes").$type<string[]>(),
  vibe_tags: jsonb("vibe_tags").$type<string[]>(),
  photo_kinds: jsonb("photo_kinds").$type<Record<string, number>>(),
  evidence: jsonb("evidence").$type<{ photos: number; menu_items: number }>(),
  feature_version: text("feature_version").notNull().default("v1-photo"),
  updated_at: timestamp("updated_at").notNull(),
});

// 멱등성 레저 — 이미 판독한 파일 재처리(=토큰 재과금) 방지
export const ingestLedger = pgTable("ingest_ledger", {
  file_hash: text("file_hash").primaryKey(),
  drive_file_id: text("drive_file_id"),
  restaurant_folder: text("restaurant_folder").notNull(),
  kind: text("kind"),
  status: text("status").notNull(), // classified | menu_extracted | skipped | failed
  processed_at: timestamp("processed_at").notNull(),
});

// Zod schemas generated from Drizzle
export const UserSchema = createSelectSchema(users);
export const InsertUserSchema = createInsertSchema(users);
export type User = z.infer<typeof UserSchema>;

export const UserFollowSchema = createSelectSchema(userFollows);
export const InsertUserFollowSchema = createInsertSchema(userFollows);
export type UserFollow = z.infer<typeof UserFollowSchema>;

export const RestaurantSchema = createSelectSchema(restaurants);
export const InsertRestaurantSchema = createInsertSchema(restaurants);
export type Restaurant = z.infer<typeof RestaurantSchema>;

export const CourseSchema = createSelectSchema(courses);
export const InsertCourseSchema = createInsertSchema(courses);
export type Course = z.infer<typeof CourseSchema>;

export const CourseItemSchema = createSelectSchema(courseItems);
export const InsertCourseItemSchema = createInsertSchema(courseItems);
export type CourseItem = z.infer<typeof CourseItemSchema>;

export const LunchieSessionSchema = createSelectSchema(sessions);
export const InsertLunchieSessionSchema = createInsertSchema(sessions);
export type LunchieSession = z.infer<typeof LunchieSessionSchema>;

export const LunchieSwipeSchema = createSelectSchema(swipes);
export const InsertLunchieSwipeSchema = createInsertSchema(swipes);
export type LunchieSwipe = z.infer<typeof LunchieSwipeSchema>;

export const SessionMemberSchema = createSelectSchema(sessionMembers);
export const InsertSessionMemberSchema = createInsertSchema(sessionMembers);
export type SessionMemberDB = z.infer<typeof SessionMemberSchema>;

export const RecEventSchema = createSelectSchema(recEvents);
export const InsertRecEventSchema = createInsertSchema(recEvents);
export type RecEvent = z.infer<typeof RecEventSchema>;
