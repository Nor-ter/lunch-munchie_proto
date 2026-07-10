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
  menu_items: jsonb("menu_items").$type<{name: string, price: number | null, image?: string, dietary?: string[], category?: string, description?: string}[]>(), // price: 가격 미표기 메뉴는 null · category: 소스 메뉴판의 섹션 헤더 그대로(예: "Mains") · description: 재료/상세 설명. 있을 때만(extractMenu)
  phone_number: text("phone_number"),
  business_hours: text("business_hours"),
  website: text("website"), // 공식 웹사이트 (메뉴 스크랩 소스)
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
  event_type: text("event_type").notNull(), // IMPRESSION | SWIPE | WINNER | NAVIGATE | VISIT | REORDER | COURSE_SAVE | COURSE_EDIT | REROLL
  slate_id: text("slate_id"),               // 같은 추천 호출/대결을 묶음 (off-policy·pairwise 기준)
  slate_type: text("slate_type"),           // PRELIM | FINAL | NEXT_STOP | COURSE_FEED
  user_id: text("user_id"),
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

// Zod schemas generated from Drizzle
export const UserSchema = createSelectSchema(users);
export const InsertUserSchema = createInsertSchema(users);
export type User = z.infer<typeof UserSchema>;

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
