-- ============================================================
-- Lunchie Munchie — 스키마 + 멜버른 샘플 데이터
-- Supabase Dashboard → SQL Editor 에 전체 붙여넣고 Run
-- shared/schema.ts 와 동일한 구조 (drizzle pg-core)
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
  id text PRIMARY KEY,
  username text NOT NULL,
  profile_image_url text,
  bio text,
  location text,
  created_at timestamp NOT NULL
);
CREATE TABLE IF NOT EXISTS restaurants (
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
);
CREATE TABLE IF NOT EXISTS courses (
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
);
CREATE TABLE IF NOT EXISTS course_items (
  id text PRIMARY KEY,
  course_id text NOT NULL,
  restaurant_id text NOT NULL,
  order_index integer NOT NULL,
  start_time text,
  end_time text,
  is_bookmarked boolean NOT NULL DEFAULT false,
  memo text,
  created_at timestamp NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
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
);
CREATE TABLE IF NOT EXISTS swipes (
  id text PRIMARY KEY,
  session_id text NOT NULL,
  user_id text NOT NULL,
  restaurant_id text NOT NULL,
  round integer NOT NULL,
  swipe_action text NOT NULL,
  created_at timestamp NOT NULL
);
CREATE TABLE IF NOT EXISTS session_members (
  id text PRIMARY KEY,
  session_id text NOT NULL,
  user_id text NOT NULL,
  user_name text NOT NULL,
  emoji text NOT NULL,
  is_ready boolean NOT NULL DEFAULT false,
  created_at timestamp NOT NULL
);

-- 멜버른 데이터로 교체 (재실행 안전: 기존 데모 데이터 제거 후 삽입)
DELETE FROM course_items;
DELETE FROM courses;
DELETE FROM restaurants;

-- ── 레스토랑 12곳 (실제 멜버른 장소) ──
INSERT INTO restaurants (id, name, category, address, latitude, longitude, rating, review_count, price_level, short_description, tags, dietary_options, photos, menu_items, phone_number, business_hours) VALUES ('r1', 'Brother Baba Budan', '카페', '359 Little Bourke St, Melbourne VIC 3000', -37.8118, 144.9606, 4.6, 3120, 2, '천장에 의자가 매달린 명물 인테리어로 유명한 멜버른 CBD 스페셜티 커피 바.', '["카페","혼자 여행"]'::jsonb, '["비건 옵션"]'::jsonb, '["https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=600&q=80"]'::jsonb, '[{"name":"Flat White","price":5},{"name":"Filter Coffee","price":6}]'::jsonb, '+61 3 9606 0449', '07:00–17:00');
INSERT INTO restaurants (id, name, category, address, latitude, longitude, rating, review_count, price_level, short_description, tags, dietary_options, photos, menu_items, phone_number, business_hours) VALUES ('r2', 'The Hardware Société', '브런치', '123 Hardware St, Melbourne VIC 3000', -37.8112, 144.9601, 4.5, 4210, 3, '프렌치 스타일 브런치 맛집. 바스크 핫초콜릿과 베이크드 에그가 시그니처.', '["맛집","카페"]'::jsonb, '["글루텐프리 옵션"]'::jsonb, '["https://images.unsplash.com/photo-1525351484163-7529414344d8?w=600&q=80"]'::jsonb, '[{"name":"Baked Eggs","price":24},{"name":"Churros","price":14}]'::jsonb, '+61 3 9078 5992', '07:30–14:30');
INSERT INTO restaurants (id, name, category, address, latitude, longitude, rating, review_count, price_level, short_description, tags, dietary_options, photos, menu_items, phone_number, business_hours) VALUES ('r3', 'Degraves Espresso', '카페', '23-25 Degraves St, Melbourne VIC 3000', -37.8166, 144.9659, 4.3, 2890, 2, '멜버른 레인웨이 카페 문화를 대표하는 디그레이브스 거리의 캐주얼 에스프레소 바.', '["카페","가성비"]'::jsonb, '[]'::jsonb, '["https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=600&q=80"]'::jsonb, '[{"name":"Cappuccino","price":5},{"name":"Croissant","price":6}]'::jsonb, '+61 3 9654 1245', '07:00–22:00');
INSERT INTO restaurants (id, name, category, address, latitude, longitude, rating, review_count, price_level, short_description, tags, dietary_options, photos, menu_items, phone_number, business_hours) VALUES ('r4', 'MoVida', '스페인 타파스', '1 Hosier Ln, Melbourne VIC 3000', -37.817, 144.969, 4.6, 5340, 3, '그래피티로 유명한 호지어 레인에 자리한 정통 스페인 타파스 바.', '["맛집","데이트 코스"]'::jsonb, '["글루텐프리 옵션"]'::jsonb, '["https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&q=80"]'::jsonb, '[{"name":"Anchoa","price":6},{"name":"Paella","price":38}]'::jsonb, '+61 3 9663 3038', '12:00–22:00');
INSERT INTO restaurants (id, name, category, address, latitude, longitude, rating, review_count, price_level, short_description, tags, dietary_options, photos, menu_items, phone_number, business_hours) VALUES ('r5', 'Chin Chin', '모던 타이', '125 Flinders Ln, Melbourne VIC 3000', -37.8156, 144.97, 4.5, 8910, 3, '플린더스 레인의 활기 넘치는 모던 타이 레스토랑. 항상 웨이팅이 있는 핫플.', '["맛집","데이트 코스"]'::jsonb, '["비건 옵션"]'::jsonb, '["https://images.unsplash.com/photo-1559314809-0d155014e29e?w=600&q=80"]'::jsonb, '[{"name":"Son in Law Eggs","price":16},{"name":"Kingfish Sashimi","price":26}]'::jsonb, '+61 3 8663 2000', '11:00–23:00');
INSERT INTO restaurants (id, name, category, address, latitude, longitude, rating, review_count, price_level, short_description, tags, dietary_options, photos, menu_items, phone_number, business_hours) VALUES ('r6', 'Pellegrini''s Espresso Bar', '이탈리안', '66 Bourke St, Melbourne VIC 3000', -37.8112, 144.9714, 4.4, 3670, 2, '1954년 문을 연 멜버른의 살아있는 역사, 클래식 이탈리안 에스프레소 바.', '["맛집","가성비"]'::jsonb, '[]'::jsonb, '["https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=600&q=80"]'::jsonb, '[{"name":"Spaghetti Bolognese","price":22},{"name":"Granita","price":6}]'::jsonb, '+61 3 9662 1885', '08:00–22:00');
INSERT INTO restaurants (id, name, category, address, latitude, longitude, rating, review_count, price_level, short_description, tags, dietary_options, photos, menu_items, phone_number, business_hours) VALUES ('r7', 'Industry Beans', '카페', '3/62 Rose St, Fitzroy VIC 3065', -37.7979, 144.9809, 4.5, 2540, 3, '자체 로스팅으로 유명한 피츠로이의 대형 창고형 스페셜티 커피 카페.', '["카페","맛집"]'::jsonb, '["비건 옵션","글루텐프리 옵션"]'::jsonb, '["https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=600&q=80"]'::jsonb, '[{"name":"Batch Brew","price":5},{"name":"Smashed Avo","price":22}]'::jsonb, '+61 3 9417 1294', '07:00–16:00');
INSERT INTO restaurants (id, name, category, address, latitude, longitude, rating, review_count, price_level, short_description, tags, dietary_options, photos, menu_items, phone_number, business_hours) VALUES ('r8', 'Lune Croissanterie', '베이커리', '119 Rose St, Fitzroy VIC 3065', -37.7977, 144.9803, 4.7, 6120, 2, '세계 최고라 불리는 크루아상 전문점. 오픈 전부터 줄을 서는 피츠로이 성지.', '["카페","맛집"]'::jsonb, '[]'::jsonb, '["https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&q=80"]'::jsonb, '[{"name":"Plain Croissant","price":7},{"name":"Kouign-Amann","price":9}]'::jsonb, '+61 3 9419 2320', '07:30–15:00');
INSERT INTO restaurants (id, name, category, address, latitude, longitude, rating, review_count, price_level, short_description, tags, dietary_options, photos, menu_items, phone_number, business_hours) VALUES ('r9', 'Gelato Messina', '디저트', '237 Smith St, Fitzroy VIC 3065', -37.7996, 144.9846, 4.7, 7340, 1, '호주에서 가장 유명한 젤라또 가게. 매주 바뀌는 스페셜 플레이버가 인기.', '["맛집","데이트 코스"]'::jsonb, '["비건 옵션"]'::jsonb, '["https://images.unsplash.com/photo-1567206563064-6f60f40a2b57?w=600&q=80"]'::jsonb, '[{"name":"Two Scoops","price":9},{"name":"Sandwich","price":12}]'::jsonb, '+61 3 9417 6328', '12:00–23:00');
INSERT INTO restaurants (id, name, category, address, latitude, longitude, rating, review_count, price_level, short_description, tags, dietary_options, photos, menu_items, phone_number, business_hours) VALUES ('r10', 'Cutler & Co', '파인다이닝', '55-57 Gertrude St, Fitzroy VIC 3065', -37.8077, 144.9784, 4.7, 1980, 4, '거트루드 스트리트의 모던 호주식 파인다이닝. 특별한 날을 위한 테이스팅 메뉴.', '["맛집","데이트 코스"]'::jsonb, '["글루텐프리 옵션"]'::jsonb, '["https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&q=80"]'::jsonb, '[{"name":"Tasting Menu","price":195},{"name":"Oysters","price":8}]'::jsonb, '+61 3 9419 4888', '18:00–23:00');
INSERT INTO restaurants (id, name, category, address, latitude, longitude, rating, review_count, price_level, short_description, tags, dietary_options, photos, menu_items, phone_number, business_hours) VALUES ('r11', 'Proud Mary', '카페', '172 Oxford St, Collingwood VIC 3066', -37.8025, 144.9869, 4.5, 4480, 3, '콜링우드의 명물 올데이 브런치 & 스페셜티 커피 로스터리.', '["카페","맛집"]'::jsonb, '["비건 옵션"]'::jsonb, '["https://images.unsplash.com/photo-1453614512568-c4024d13c247?w=600&q=80"]'::jsonb, '[{"name":"Single Origin","price":6},{"name":"Ricotta Hotcakes","price":24}]'::jsonb, '+61 3 9417 5930', '07:00–16:00');
INSERT INTO restaurants (id, name, category, address, latitude, longitude, rating, review_count, price_level, short_description, tags, dietary_options, photos, menu_items, phone_number, business_hours) VALUES ('r12', 'Smith & Daughters', '비건', '175 Brunswick St, Fitzroy VIC 3065', -37.8047, 144.9786, 4.6, 2210, 3, '브런즈윅 스트리트의 100% 식물성 레스토랑. 비건도 만족하는 풍성한 한 끼.', '["맛집","혼자 여행"]'::jsonb, '["비건 옵션","글루텐프리 옵션"]'::jsonb, '["https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&q=80"]'::jsonb, '[{"name":"Mushroom Parma","price":28},{"name":"Tiramisu","price":14}]'::jsonb, '+61 3 9939 3293', '17:00–22:00');
INSERT INTO restaurants (id, name, category, address, latitude, longitude, rating, review_count, price_level, short_description, tags, dietary_options, photos, menu_items, phone_number, business_hours) VALUES ('r13', 'Guhng Korean BBQ', '한식', 'Healeys Ln, Melbourne VIC 3000', -37.8096, 144.9663, 4.5, 1870, 3, '멜버른 CBD 한인타운의 인기 한국식 숯불 바비큐. 삼겹살과 갈비가 시그니처.', '["맛집","맛집 투어"]'::jsonb, '[]'::jsonb, '["https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&q=80"]'::jsonb, '[{"name":"Pork Belly","price":28},{"name":"Galbi","price":34}]'::jsonb, '+61 3 9663 6420', '11:30–22:30');
INSERT INTO restaurants (id, name, category, address, latitude, longitude, rating, review_count, price_level, short_description, tags, dietary_options, photos, menu_items, phone_number, business_hours) VALUES ('r14', 'Gami Chicken', '치킨', '396 Little Bourke St, Melbourne VIC 3000', -37.812, 144.9612, 4.4, 3260, 2, '바삭한 한국식 양념치킨과 생맥주로 유명한 멜버른 인기 체인.', '["맛집","가성비"]'::jsonb, '[]'::jsonb, '["https://images.unsplash.com/photo-1569050467447-ce54b3bbc37d?w=600&q=80"]'::jsonb, '[{"name":"Yangnyeom Chicken","price":24},{"name":"Soy Garlic","price":24}]'::jsonb, '+61 3 9077 8189', '11:30–22:00');
INSERT INTO restaurants (id, name, category, address, latitude, longitude, rating, review_count, price_level, short_description, tags, dietary_options, photos, menu_items, phone_number, business_hours) VALUES ('r15', 'Kong BBQ', '한식', '599 Church St, Richmond VIC 3121', -37.8243, 145.0008, 4.5, 2440, 3, '코리안 바비큐에 일식·멕시칸을 더한 리치먼드의 퓨전 BBQ 핫플.', '["맛집","데이트 코스"]'::jsonb, '[]'::jsonb, '["https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&q=80"]'::jsonb, '[{"name":"Wagyu Bulgogi","price":38},{"name":"Kimchi Fried Rice","price":16}]'::jsonb, '+61 3 9428 3187', '17:30–22:00');
INSERT INTO restaurants (id, name, category, address, latitude, longitude, rating, review_count, price_level, short_description, tags, dietary_options, photos, menu_items, phone_number, business_hours) VALUES ('r16', 'HuTong Dumpling Bar', '중식', '14-16 Market Ln, Melbourne VIC 3000', -37.8119, 144.9684, 4.5, 5120, 2, '멜버른 차이나타운의 샤오롱바오 성지. 육즙 가득한 수제 만두가 일품.', '["맛집","맛집 투어"]'::jsonb, '[]'::jsonb, '["https://images.unsplash.com/photo-1559314809-0d155014e29e?w=600&q=80"]'::jsonb, '[{"name":"Xiao Long Bao","price":13},{"name":"Pan-fried Dumplings","price":13}]'::jsonb, '+61 3 9650 8128', '11:30–22:00');
INSERT INTO restaurants (id, name, category, address, latitude, longitude, rating, review_count, price_level, short_description, tags, dietary_options, photos, menu_items, phone_number, business_hours) VALUES ('r17', 'Tim Ho Wan', '중식', '206 Bourke St, Melbourne VIC 3000', -37.8112, 144.9672, 4.3, 4380, 2, '미슐랭 딤섬으로 유명한 홍콩 브랜드. 바비큐 포크 번이 시그니처.', '["맛집","가성비"]'::jsonb, '[]'::jsonb, '["https://images.unsplash.com/photo-1559314809-0d155014e29e?w=600&q=80"]'::jsonb, '[{"name":"BBQ Pork Bun","price":9},{"name":"Har Gow","price":10}]'::jsonb, '+61 3 9650 6388', '10:00–21:30');
INSERT INTO restaurants (id, name, category, address, latitude, longitude, rating, review_count, price_level, short_description, tags, dietary_options, photos, menu_items, phone_number, business_hours) VALUES ('r18', 'Supper Inn', '중식', '15 Celestial Ave, Melbourne VIC 3000', -37.8116, 144.9689, 4.4, 1760, 2, '새벽까지 여는 차이나타운 광둥식 노포. 야식으로 사랑받는 숨은 명소.', '["맛집","혼자 여행"]'::jsonb, '[]'::jsonb, '["https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&q=80"]'::jsonb, '[{"name":"Congee","price":12},{"name":"Roast Duck","price":22}]'::jsonb, '+61 3 9663 4759', '17:30–02:30');
INSERT INTO restaurants (id, name, category, address, latitude, longitude, rating, review_count, price_level, short_description, tags, dietary_options, photos, menu_items, phone_number, business_hours) VALUES ('r19', 'Supernormal', '일식', '180 Flinders Ln, Melbourne VIC 3000', -37.8159, 144.9694, 4.6, 3910, 3, '플린더스 레인의 모던 아시안. 시그니처 랍스터 롤이 유명한 핫플.', '["맛집","데이트 코스"]'::jsonb, '["비건 옵션"]'::jsonb, '["https://images.unsplash.com/photo-1559314809-0d155014e29e?w=600&q=80"]'::jsonb, '[{"name":"Lobster Roll","price":18},{"name":"Dumplings","price":16}]'::jsonb, '+61 3 9650 8688', '11:00–23:00');
INSERT INTO restaurants (id, name, category, address, latitude, longitude, rating, review_count, price_level, short_description, tags, dietary_options, photos, menu_items, phone_number, business_hours) VALUES ('r20', 'Izakaya Den', '일식', '114 Russell St, Melbourne VIC 3000', -37.8136, 144.9676, 4.5, 2130, 3, '러셀 스트리트 지하의 분위기 좋은 정통 이자카야. 사케와 안주가 훌륭.', '["맛집","데이트 코스"]'::jsonb, '[]'::jsonb, '["https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&q=80"]'::jsonb, '[{"name":"Sashimi Plate","price":26},{"name":"Karaage","price":14}]'::jsonb, '+61 3 9654 2977', '17:00–23:00');
INSERT INTO restaurants (id, name, category, address, latitude, longitude, rating, review_count, price_level, short_description, tags, dietary_options, photos, menu_items, phone_number, business_hours) VALUES ('r21', 'Minamishima', '일식', '4 Lord St, Richmond VIC 3121', -37.8189, 144.9987, 4.8, 980, 4, '멜버른 최고의 스시 오마카세. 예약 필수의 프리미엄 에도마에 스시.', '["맛집","데이트 코스"]'::jsonb, '[]'::jsonb, '["https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&q=80"]'::jsonb, '[{"name":"Omakase","price":225},{"name":"Sake Pairing","price":95}]'::jsonb, '+61 3 9429 5180', '18:00–22:00');
INSERT INTO restaurants (id, name, category, address, latitude, longitude, rating, review_count, price_level, short_description, tags, dietary_options, photos, menu_items, phone_number, business_hours) VALUES ('r22', 'Tipo 00', '이탈리안', '361 Little Bourke St, Melbourne VIC 3000', -37.8119, 144.9609, 4.6, 4070, 3, '멜버른을 대표하는 수제 파스타 바. 늘 붐비는 CBD 이탈리안 맛집.', '["맛집","데이트 코스"]'::jsonb, '["비건 옵션"]'::jsonb, '["https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=600&q=80"]'::jsonb, '[{"name":"Squid Ink Spaghetti","price":30},{"name":"Tagliatelle","price":28}]'::jsonb, '+61 3 9942 3946', '12:00–22:00');
INSERT INTO restaurants (id, name, category, address, latitude, longitude, rating, review_count, price_level, short_description, tags, dietary_options, photos, menu_items, phone_number, business_hours) VALUES ('r23', 'DOC Pizza & Mozzarella Bar', '이탈리안', '295 Drummond St, Carlton VIC 3053', -37.7996, 144.9671, 4.4, 3550, 2, '칼튼 라이곤 스트리트 인근의 나폴리 피자 & 모짜렐라 바.', '["맛집","가성비"]'::jsonb, '["비건 옵션"]'::jsonb, '["https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=600&q=80"]'::jsonb, '[{"name":"Margherita","price":22},{"name":"Burrata","price":16}]'::jsonb, '+61 3 9347 8482', '12:00–22:00');
INSERT INTO restaurants (id, name, category, address, latitude, longitude, rating, review_count, price_level, short_description, tags, dietary_options, photos, menu_items, phone_number, business_hours) VALUES ('r24', 'San Telmo', '스테이크', '14 Meyers Pl, Melbourne VIC 3000', -37.8118, 144.9708, 4.5, 2280, 4, '아르헨티나식 숯불 그릴(아사도) 전문점. 두툼한 스테이크가 명물.', '["맛집","데이트 코스"]'::jsonb, '[]'::jsonb, '["https://images.unsplash.com/photo-1558030006-450675393462?w=600&q=80"]'::jsonb, '[{"name":"Ribeye 400g","price":62},{"name":"Provoleta","price":18}]'::jsonb, '+61 3 9650 5525', '12:00–23:00');

-- ── 코스 5개 (3·4·5개 장소 버전 포함) + 코스 아이템 ──
INSERT INTO courses (id, author_id, title, description, hero_image, category, region, tags, hashtags, total_distance, total_duration, is_public, created_at) VALUES ('c1', 'user1', '멜버른 CBD 커피 & 레인웨이', '멜버른 커피 문화의 정수를 맛보는 도심 레인웨이 산책 코스.', 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800&q=80', '카페', '멜버른 CBD', '["카페","혼자 여행"]'::jsonb, '["#멜버른커피","#레인웨이","#CBD","#카페투어"]'::jsonb, 0.9, 180, true, '2026-05-28T00:00:00.000Z');
INSERT INTO course_items (id, course_id, restaurant_id, order_index, start_time, end_time, is_bookmarked, created_at) VALUES ('ci_c1_1', 'c1', 'r1', 1, '09:00', '09:50', false, '2026-05-28T00:00:00.000Z');
INSERT INTO course_items (id, course_id, restaurant_id, order_index, start_time, end_time, is_bookmarked, created_at) VALUES ('ci_c1_2', 'c1', 'r3', 2, '10:10', '11:00', true, '2026-05-28T00:00:00.000Z');
INSERT INTO course_items (id, course_id, restaurant_id, order_index, start_time, end_time, is_bookmarked, created_at) VALUES ('ci_c1_3', 'c1', 'r6', 3, '11:20', '12:30', false, '2026-05-28T00:00:00.000Z');
INSERT INTO courses (id, author_id, title, description, hero_image, category, region, tags, hashtags, total_distance, total_duration, is_public, created_at) VALUES ('c2', 'user2', '플린더스 레인 미식 투어', '브런치부터 타파스, 모던 타이까지 플린더스 레인을 따라가는 맛집 코스.', 'https://images.unsplash.com/photo-1559314809-0d155014e29e?w=800&q=80', '맛집', '플린더스 레인', '["맛집","데이트 코스"]'::jsonb, '["#플린더스레인","#멜버른맛집","#브런치","#타파스"]'::jsonb, 1.3, 300, true, '2026-05-25T00:00:00.000Z');
INSERT INTO course_items (id, course_id, restaurant_id, order_index, start_time, end_time, is_bookmarked, created_at) VALUES ('ci_c2_1', 'c2', 'r2', 1, '09:30', '10:50', false, '2026-05-25T00:00:00.000Z');
INSERT INTO course_items (id, course_id, restaurant_id, order_index, start_time, end_time, is_bookmarked, created_at) VALUES ('ci_c2_2', 'c2', 'r3', 2, '11:10', '11:50', false, '2026-05-25T00:00:00.000Z');
INSERT INTO course_items (id, course_id, restaurant_id, order_index, start_time, end_time, is_bookmarked, created_at) VALUES ('ci_c2_3', 'c2', 'r4', 3, '12:30', '14:00', true, '2026-05-25T00:00:00.000Z');
INSERT INTO course_items (id, course_id, restaurant_id, order_index, start_time, end_time, is_bookmarked, created_at) VALUES ('ci_c2_4', 'c2', 'r5', 4, '18:00', '19:30', false, '2026-05-25T00:00:00.000Z');
INSERT INTO courses (id, author_id, title, description, hero_image, category, region, tags, hashtags, total_distance, total_duration, is_public, created_at) VALUES ('c3', 'user3', '피츠로이 하루 종일 코스', '커피, 크루아상, 젤라또, 그리고 파인다이닝까지 — 피츠로이를 온전히 즐기는 풀데이 코스.', 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&q=80', '데이트', '피츠로이', '["맛집","데이트 코스"]'::jsonb, '["#피츠로이","#멜버른","#카페","#파인다이닝","#하루코스"]'::jsonb, 2.6, 420, true, '2026-05-22T00:00:00.000Z');
INSERT INTO course_items (id, course_id, restaurant_id, order_index, start_time, end_time, is_bookmarked, created_at) VALUES ('ci_c3_1', 'c3', 'r7', 1, '08:30', '09:30', false, '2026-05-22T00:00:00.000Z');
INSERT INTO course_items (id, course_id, restaurant_id, order_index, start_time, end_time, is_bookmarked, created_at) VALUES ('ci_c3_2', 'c3', 'r8', 2, '09:50', '10:40', true, '2026-05-22T00:00:00.000Z');
INSERT INTO course_items (id, course_id, restaurant_id, order_index, start_time, end_time, is_bookmarked, created_at) VALUES ('ci_c3_3', 'c3', 'r9', 3, '14:00', '14:40', false, '2026-05-22T00:00:00.000Z');
INSERT INTO course_items (id, course_id, restaurant_id, order_index, start_time, end_time, is_bookmarked, created_at) VALUES ('ci_c3_4', 'c3', 'r12', 4, '17:30', '18:40', false, '2026-05-22T00:00:00.000Z');
INSERT INTO course_items (id, course_id, restaurant_id, order_index, start_time, end_time, is_bookmarked, created_at) VALUES ('ci_c3_5', 'c3', 'r10', 5, '19:00', '21:30', true, '2026-05-22T00:00:00.000Z');
INSERT INTO courses (id, author_id, title, description, hero_image, category, region, tags, hashtags, total_distance, total_duration, is_public, created_at) VALUES ('c4', 'user2', '피츠로이 디저트 & 비건', '달콤한 크루아상과 젤라또, 식물성 디너로 마무리하는 가벼운 저녁 코스.', 'https://images.unsplash.com/photo-1567206563064-6f60f40a2b57?w=800&q=80', '카페', '피츠로이', '["카페","혼자 여행"]'::jsonb, '["#디저트","#비건","#피츠로이","#젤라또"]'::jsonb, 0.7, 150, true, '2026-05-20T00:00:00.000Z');
INSERT INTO course_items (id, course_id, restaurant_id, order_index, start_time, end_time, is_bookmarked, created_at) VALUES ('ci_c4_1', 'c4', 'r8', 1, '11:00', '11:40', false, '2026-05-20T00:00:00.000Z');
INSERT INTO course_items (id, course_id, restaurant_id, order_index, start_time, end_time, is_bookmarked, created_at) VALUES ('ci_c4_2', 'c4', 'r9', 2, '15:00', '15:40', false, '2026-05-20T00:00:00.000Z');
INSERT INTO course_items (id, course_id, restaurant_id, order_index, start_time, end_time, is_bookmarked, created_at) VALUES ('ci_c4_3', 'c4', 'r12', 3, '18:00', '19:30', true, '2026-05-20T00:00:00.000Z');
INSERT INTO courses (id, author_id, title, description, hero_image, category, region, tags, hashtags, total_distance, total_duration, is_public, created_at) VALUES ('c5', 'user1', 'CBD → 피츠로이 크로스 데이트', '도심 커피로 시작해 모던 타이 점심, 콜링우드 카페, 거트루드 파인다이닝으로 이어지는 하루 데이트.', 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80', '데이트', '멜버른', '["데이트 코스","맛집"]'::jsonb, '["#데이트","#멜버른","#CBD","#콜링우드","#피츠로이"]'::jsonb, 4.5, 360, true, '2026-05-18T00:00:00.000Z');
INSERT INTO course_items (id, course_id, restaurant_id, order_index, start_time, end_time, is_bookmarked, created_at) VALUES ('ci_c5_1', 'c5', 'r1', 1, '09:00', '09:50', false, '2026-05-18T00:00:00.000Z');
INSERT INTO course_items (id, course_id, restaurant_id, order_index, start_time, end_time, is_bookmarked, created_at) VALUES ('ci_c5_2', 'c5', 'r5', 2, '12:00', '13:30', true, '2026-05-18T00:00:00.000Z');
INSERT INTO course_items (id, course_id, restaurant_id, order_index, start_time, end_time, is_bookmarked, created_at) VALUES ('ci_c5_3', 'c5', 'r11', 3, '15:00', '16:00', false, '2026-05-18T00:00:00.000Z');
INSERT INTO course_items (id, course_id, restaurant_id, order_index, start_time, end_time, is_bookmarked, created_at) VALUES ('ci_c5_4', 'c5', 'r10', 4, '19:00', '21:30', false, '2026-05-18T00:00:00.000Z');
INSERT INTO courses (id, author_id, title, description, hero_image, category, region, tags, hashtags, total_distance, total_duration, is_public, created_at) VALUES ('c6', 'user2', '서울 in 멜버른: 한식 코스', '숯불 바비큐부터 양념치킨까지, 멜버른에서 즐기는 진짜 한식 투어.', 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80', '한식', '멜버른 CBD', '["맛집","맛집 투어"]'::jsonb, '["#한식","#코리안BBQ","#멜버른맛집","#치킨"]'::jsonb, 5.2, 300, true, '2026-06-02T00:00:00.000Z');
INSERT INTO course_items (id, course_id, restaurant_id, order_index, start_time, end_time, is_bookmarked, created_at) VALUES ('ci_c6_1', 'c6', 'r13', 1, '12:00', '13:30', false, '2026-06-02T00:00:00.000Z');
INSERT INTO course_items (id, course_id, restaurant_id, order_index, start_time, end_time, is_bookmarked, created_at) VALUES ('ci_c6_2', 'c6', 'r14', 2, '17:00', '18:00', true, '2026-06-02T00:00:00.000Z');
INSERT INTO course_items (id, course_id, restaurant_id, order_index, start_time, end_time, is_bookmarked, created_at) VALUES ('ci_c6_3', 'c6', 'r15', 3, '18:30', '20:30', false, '2026-06-02T00:00:00.000Z');
INSERT INTO courses (id, author_id, title, description, hero_image, category, region, tags, hashtags, total_distance, total_duration, is_public, created_at) VALUES ('c7', 'user3', '차이나타운 딤섬 & 광둥 코스', '멜버른 차이나타운에서 샤오롱바오, 미슐랭 딤섬, 심야 광둥식까지.', 'https://images.unsplash.com/photo-1559314809-0d155014e29e?w=800&q=80', '중식', '차이나타운', '["맛집","맛집 투어"]'::jsonb, '["#중식","#차이나타운","#딤섬","#만두"]'::jsonb, 0.5, 240, true, '2026-06-03T00:00:00.000Z');
INSERT INTO course_items (id, course_id, restaurant_id, order_index, start_time, end_time, is_bookmarked, created_at) VALUES ('ci_c7_1', 'c7', 'r16', 1, '12:00', '13:20', true, '2026-06-03T00:00:00.000Z');
INSERT INTO course_items (id, course_id, restaurant_id, order_index, start_time, end_time, is_bookmarked, created_at) VALUES ('ci_c7_2', 'c7', 'r17', 2, '13:40', '14:40', false, '2026-06-03T00:00:00.000Z');
INSERT INTO course_items (id, course_id, restaurant_id, order_index, start_time, end_time, is_bookmarked, created_at) VALUES ('ci_c7_3', 'c7', 'r18', 3, '18:00', '19:30', false, '2026-06-03T00:00:00.000Z');
INSERT INTO courses (id, author_id, title, description, hero_image, category, region, tags, hashtags, total_distance, total_duration, is_public, created_at) VALUES ('c8', 'user1', '멜버른 이자카야 & 오마카세', '모던 아시안 다이닝으로 시작해 이자카야, 그리고 프리미엄 스시 오마카세로.', 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80', '일식', '멜버른', '["맛집","데이트 코스"]'::jsonb, '["#일식","#이자카야","#오마카세","#스시"]'::jsonb, 4.8, 330, true, '2026-06-04T00:00:00.000Z');
INSERT INTO course_items (id, course_id, restaurant_id, order_index, start_time, end_time, is_bookmarked, created_at) VALUES ('ci_c8_1', 'c8', 'r19', 1, '12:00', '13:30', false, '2026-06-04T00:00:00.000Z');
INSERT INTO course_items (id, course_id, restaurant_id, order_index, start_time, end_time, is_bookmarked, created_at) VALUES ('ci_c8_2', 'c8', 'r20', 2, '17:30', '19:00', false, '2026-06-04T00:00:00.000Z');
INSERT INTO course_items (id, course_id, restaurant_id, order_index, start_time, end_time, is_bookmarked, created_at) VALUES ('ci_c8_3', 'c8', 'r21', 3, '19:30', '21:30', true, '2026-06-04T00:00:00.000Z');
INSERT INTO courses (id, author_id, title, description, hero_image, category, region, tags, hashtags, total_distance, total_duration, is_public, created_at) VALUES ('c9', 'user2', '파스타·피자 이탈리안 코스', '수제 파스타, 클래식 에스프레소 바, 나폴리 피자로 이어지는 이탈리안 미식.', 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=800&q=80', '이탈리안', '멜버른 CBD', '["맛집","데이트 코스"]'::jsonb, '["#이탈리안","#파스타","#피자","#멜버른"]'::jsonb, 2.4, 270, true, '2026-06-05T00:00:00.000Z');
INSERT INTO course_items (id, course_id, restaurant_id, order_index, start_time, end_time, is_bookmarked, created_at) VALUES ('ci_c9_1', 'c9', 'r22', 1, '12:00', '13:30', true, '2026-06-05T00:00:00.000Z');
INSERT INTO course_items (id, course_id, restaurant_id, order_index, start_time, end_time, is_bookmarked, created_at) VALUES ('ci_c9_2', 'c9', 'r6', 2, '15:00', '16:00', false, '2026-06-05T00:00:00.000Z');
INSERT INTO course_items (id, course_id, restaurant_id, order_index, start_time, end_time, is_bookmarked, created_at) VALUES ('ci_c9_3', 'c9', 'r23', 3, '18:30', '20:00', false, '2026-06-05T00:00:00.000Z');
INSERT INTO courses (id, author_id, title, description, hero_image, category, region, tags, hashtags, total_distance, total_duration, is_public, created_at) VALUES ('c10', 'user1', '저기압일 땐 고기 앞으로', '기분이 가라앉는 날엔 역시 고기. 숯불 한우, 아르헨티나 아사도, 코리안 BBQ에 파인다이닝 고기까지 — 고기로 시작해 고기로 끝나는 날.', 'https://images.unsplash.com/photo-1558030006-450675393462?w=800&q=80', '고기', '멜버른', '["맛집","맛집 투어"]'::jsonb, '["#고기맛집","#육식주의","#저기압엔고기","#멜버른"]'::jsonb, 7.6, 420, true, '2026-06-06T00:00:00.000Z');
INSERT INTO course_items (id, course_id, restaurant_id, order_index, start_time, end_time, is_bookmarked, created_at) VALUES ('ci_c10_1', 'c10', 'r13', 1, '12:00', '13:30', false, '2026-06-06T00:00:00.000Z');
INSERT INTO course_items (id, course_id, restaurant_id, order_index, start_time, end_time, is_bookmarked, created_at) VALUES ('ci_c10_2', 'c10', 'r24', 2, '15:00', '16:30', true, '2026-06-06T00:00:00.000Z');
INSERT INTO course_items (id, course_id, restaurant_id, order_index, start_time, end_time, is_bookmarked, created_at) VALUES ('ci_c10_3', 'c10', 'r15', 3, '18:00', '19:30', false, '2026-06-06T00:00:00.000Z');
INSERT INTO course_items (id, course_id, restaurant_id, order_index, start_time, end_time, is_bookmarked, created_at) VALUES ('ci_c10_4', 'c10', 'r10', 4, '20:00', '22:00', true, '2026-06-06T00:00:00.000Z');
INSERT INTO courses (id, author_id, title, description, hero_image, category, region, tags, hashtags, total_distance, total_duration, is_public, created_at) VALUES ('c11', 'user3', '탄수화물은 죄가 없다', '크루아상으로 시작해 파스타, 피자로 달리는 무한 탄수화물 코스. 다이어트는 내일부터.', 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&q=80', '디저트', '멜버른', '["카페","맛집"]'::jsonb, '["#탄수화물","#빵순이","#파스타","#피자","#치팅데이"]'::jsonb, 3, 240, true, '2026-06-07T00:00:00.000Z');
INSERT INTO course_items (id, course_id, restaurant_id, order_index, start_time, end_time, is_bookmarked, created_at) VALUES ('ci_c11_1', 'c11', 'r8', 1, '09:00', '10:00', true, '2026-06-07T00:00:00.000Z');
INSERT INTO course_items (id, course_id, restaurant_id, order_index, start_time, end_time, is_bookmarked, created_at) VALUES ('ci_c11_2', 'c11', 'r22', 2, '12:30', '14:00', false, '2026-06-07T00:00:00.000Z');
INSERT INTO course_items (id, course_id, restaurant_id, order_index, start_time, end_time, is_bookmarked, created_at) VALUES ('ci_c11_3', 'c11', 'r23', 3, '18:00', '19:30', false, '2026-06-07T00:00:00.000Z');

-- 확인
SELECT 'restaurants' AS t, count(*) FROM restaurants UNION ALL SELECT 'courses', count(*) FROM courses UNION ALL SELECT 'course_items', count(*) FROM course_items;

