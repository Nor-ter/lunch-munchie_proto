// melbourneData.ts 의 샘플 데이터로부터 Supabase SQL Editor에 붙여넣을 수 있는
// 완전한 SQL 스크립트(스키마 생성 + 멜버른 데이터 시드)를 생성한다.
// 사용: npx tsx scripts/genSeedSql.ts > supabase_seed.sql
import { MOCK_RESTAURANTS, MOCK_COURSES } from "../server/melbourneData.js";

const q = (v: string | null | undefined) =>
  v == null ? "NULL" : `'${String(v).replace(/'/g, "''")}'`;
const jsonb = (v: unknown) =>
  v == null ? "NULL" : `'${JSON.stringify(v).replace(/'/g, "''")}'::jsonb`;
const num = (v: number) => String(v);
const bool = (v: boolean) => (v ? "true" : "false");

const lines: string[] = [];
lines.push("-- ============================================================");
lines.push("-- Lunchie Munchie — 스키마 + 멜버른 샘플 데이터");
lines.push("-- Supabase Dashboard → SQL Editor 에 전체 붙여넣고 Run");
lines.push("-- shared/schema.ts 와 동일한 구조 (drizzle pg-core)");
lines.push("-- ============================================================");
lines.push("");
lines.push(`CREATE TABLE IF NOT EXISTS users (
  id text PRIMARY KEY,
  username text NOT NULL,
  profile_image_url text,
  bio text,
  location text,
  created_at timestamp NOT NULL
);`);
lines.push(`CREATE TABLE IF NOT EXISTS restaurants (
  id text PRIMARY KEY,
  name text NOT NULL,
  category text NOT NULL DEFAULT '기타',
  address text NOT NULL,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  rating double precision NOT NULL,
  review_count integer NOT NULL DEFAULT 0,
  price_level integer NOT NULL,
  short_description text,
  tags jsonb,
  dietary_options jsonb,
  photos jsonb,
  menu_items jsonb,
  phone_number text,
  business_hours text
);`);
lines.push(`CREATE TABLE IF NOT EXISTS courses (
  id text PRIMARY KEY,
  author_id text NOT NULL,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  hero_image text NOT NULL DEFAULT '',
  category text NOT NULL,
  region text NOT NULL DEFAULT '',
  tags jsonb,
  hashtags jsonb,
  total_distance double precision NOT NULL,
  total_duration integer NOT NULL,
  likes_count integer NOT NULL DEFAULT 0,
  saves_count integer NOT NULL DEFAULT 0,
  route_polyline text,
  share_image_url text,
  comments_count integer NOT NULL DEFAULT 0,
  is_public boolean NOT NULL DEFAULT true,
  created_at timestamp NOT NULL
);`);
lines.push(`CREATE TABLE IF NOT EXISTS course_items (
  id text PRIMARY KEY,
  course_id text NOT NULL,
  restaurant_id text NOT NULL,
  order_index integer NOT NULL,
  start_time text,
  end_time text,
  is_bookmarked boolean NOT NULL DEFAULT false,
  memo text,
  created_at timestamp NOT NULL
);`);
lines.push(`CREATE TABLE IF NOT EXISTS sessions (
  id text PRIMARY KEY,
  host_user_id text NOT NULL,
  share_token text NOT NULL,
  status text NOT NULL,
  deadline_at timestamp NOT NULL,
  group_size integer NOT NULL,
  filter_distance integer NOT NULL,
  filter_budget integer NOT NULL,
  filter_min_rating double precision NOT NULL,
  filter_dietary jsonb,
  filter_vibe jsonb,
  swipe_limit integer NOT NULL,
  top_restaurant_ids jsonb,
  final_restaurant_id text,
  created_at timestamp NOT NULL
);`);
lines.push(`CREATE TABLE IF NOT EXISTS swipes (
  id text PRIMARY KEY,
  session_id text NOT NULL,
  user_id text NOT NULL,
  restaurant_id text NOT NULL,
  round integer NOT NULL,
  swipe_action text NOT NULL,
  created_at timestamp NOT NULL
);`);
lines.push(`CREATE TABLE IF NOT EXISTS session_members (
  id text PRIMARY KEY,
  session_id text NOT NULL,
  user_id text NOT NULL,
  user_name text NOT NULL,
  emoji text NOT NULL,
  is_ready boolean NOT NULL DEFAULT false,
  created_at timestamp NOT NULL
);`);
lines.push("");
lines.push("-- 멜버른 데이터로 교체 (재실행 안전: 기존 데모 데이터 제거 후 삽입)");
lines.push("DELETE FROM course_items;");
lines.push("DELETE FROM courses;");
lines.push("DELETE FROM restaurants;");
lines.push("");

lines.push("-- ── 레스토랑 12곳 (실제 멜버른 장소) ──");
for (const r of MOCK_RESTAURANTS) {
  lines.push(
    `INSERT INTO restaurants (id, name, category, address, latitude, longitude, rating, review_count, price_level, short_description, tags, dietary_options, photos, menu_items, phone_number, business_hours) VALUES (` +
      `${q(r.id)}, ${q(r.name)}, ${q(r.category)}, ${q(r.address)}, ${num(r.latitude)}, ${num(r.longitude)}, ${num(r.rating)}, ${num(r.review_count)}, ${num(r.price_level)}, ${q(r.short_description)}, ${jsonb(r.tags)}, ${jsonb(r.dietary_options)}, ${jsonb(r.photos)}, ${jsonb(r.menu_items)}, ${q(r.phone_number)}, ${q(r.business_hours)});`
  );
}
lines.push("");
lines.push("-- ── 코스 5개 (3·4·5개 장소 버전 포함) + 코스 아이템 ──");
for (const c of MOCK_COURSES) {
  const created = new Date(c.created_at).toISOString();
  lines.push(
    `INSERT INTO courses (id, author_id, title, description, hero_image, category, region, tags, hashtags, total_distance, total_duration, is_public, created_at) VALUES (` +
      `${q(c.id)}, ${q(c.author_id)}, ${q(c.title)}, ${q(c.description)}, ${q(c.hero_image)}, ${q(c.category)}, ${q(c.region)}, ${jsonb(c.tags)}, ${jsonb(c.hashtags)}, ${num(c.total_distance)}, ${num(c.total_duration)}, true, ${q(created)});`
  );
  for (const s of c.stops) {
    lines.push(
      `INSERT INTO course_items (id, course_id, restaurant_id, order_index, start_time, end_time, is_bookmarked, created_at) VALUES (` +
        `${q(`ci_${c.id}_${s.order}`)}, ${q(c.id)}, ${q(s.placeId)}, ${num(s.order)}, ${q(s.startTime)}, ${q(s.endTime)}, ${bool(s.isBookmarked)}, ${q(created)});`
    );
  }
}
lines.push("");
lines.push("-- 확인");
lines.push("SELECT 'restaurants' AS t, count(*) FROM restaurants UNION ALL SELECT 'courses', count(*) FROM courses UNION ALL SELECT 'course_items', count(*) FROM course_items;");
lines.push("");

console.log(lines.join("\n"));
