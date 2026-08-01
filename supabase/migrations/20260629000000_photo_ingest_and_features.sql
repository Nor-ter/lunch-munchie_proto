-- ============================================================
-- 드라이브 사진 인제스천 + 피처 스토어 (콜드스타트 해소)
-- 설계: docs/superpowers/specs/2026-06-29-drive-photo-ingestion.md
--
-- 왜: features.ts의 아이템 벡터 x_i가 카테고리 정규식 + price_level만으로
--     만들어져 같은 카테고리 식당이 동일 피처가 된다 → 식당 단위 학습 불가.
--     사진/메뉴 메타데이터로 식당별 고유 피처를 만든다.
--
-- 원칙: 사진 바이너리는 저장하지 않고 Drive file_id/URL만 보관.
--       메뉴판 사진은 메뉴 정보만 추출하고 photos 테이블에 넣지 않는다.
-- ============================================================

-- ① 사진 메타 --------------------------------------------------
-- 메뉴판(kind=menu)은 여기 저장하지 않는다 (판독 후 폐기 — 요구사항).
CREATE TABLE IF NOT EXISTS public.restaurant_photos (
  id             text PRIMARY KEY,
  restaurant_id  text NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  drive_file_id  text,
  url            text,
  kind           text NOT NULL CHECK (kind IN ('storefront','interior','dish','table','other')),
  dishes         jsonb DEFAULT '[]'::jsonb,   -- 보이는 음식명 (dish/table)
  vibe_tags      jsonb DEFAULT '[]'::jsonb,   -- 분위기 태그
  quality        real,                        -- 0~1
  contributor    text,                        -- 업로드한 팀원 (기여 추적)
  source         text NOT NULL DEFAULT 'drive',
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS restaurant_photos_rid_idx  ON public.restaurant_photos(restaurant_id);
CREATE INDEX IF NOT EXISTS restaurant_photos_kind_idx ON public.restaurant_photos(kind);
CREATE UNIQUE INDEX IF NOT EXISTS restaurant_photos_drive_uidx
  ON public.restaurant_photos(drive_file_id) WHERE drive_file_id IS NOT NULL;

-- ② 메뉴 (restaurants.menu_items JSONB → 테이블 승격) -----------
-- 여러 소스(웹사이트/사진)를 충돌 없이 병합·업서트하기 위해 분리.
CREATE TABLE IF NOT EXISTS public.restaurant_menu_items (
  id               text PRIMARY KEY,
  restaurant_id    text NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name             text NOT NULL,
  normalized_name  text NOT NULL,             -- 소문자·공백정규화 (중복 판정 키)
  price            real,                      -- 미표기면 NULL
  currency         text NOT NULL DEFAULT 'AUD',
  category         text,                      -- 메뉴판 섹션 헤더 그대로 (예: Mains)
  description      text,
  dietary          jsonb DEFAULT '[]'::jsonb,
  source           text NOT NULL CHECK (source IN ('website','drive_photo','manual')),
  confidence       real,                      -- 판독 신뢰도 0~1
  is_signature     boolean NOT NULL DEFAULT false,
  extracted_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (restaurant_id, normalized_name, source)
);
CREATE INDEX IF NOT EXISTS restaurant_menu_items_rid_idx ON public.restaurant_menu_items(restaurant_id);

-- ③ 피처 스토어 ★ 콜드스타트 해소 지점 -------------------------
-- server/engine/features.ts 의 buildItemVector 가 이걸 우선 조회하고,
-- 없으면 기존 카테고리 룰로 폴백한다.
CREATE TABLE IF NOT EXISTS public.restaurant_features (
  restaurant_id    text PRIMARY KEY REFERENCES public.restaurants(id) ON DELETE CASCADE,
  taste            jsonb,   -- {spicy,salty,sweet,oily,light} 각 0~1
  price_stats      jsonb,   -- {min,max,median,n} 실측 메뉴가격
  signature_dishes jsonb DEFAULT '[]'::jsonb,
  vibe_tags        jsonb DEFAULT '[]'::jsonb,
  photo_kinds      jsonb,   -- {storefront:2, dish:5, ...} 커버리지 진단
  evidence         jsonb,   -- {photos:n, menu_items:n} 신뢰도 근거
  feature_version  text NOT NULL DEFAULT 'v1-photo',
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- ④ 인제스천 레저 (멱등성 = 토큰 재과금 방지) -------------------
CREATE TABLE IF NOT EXISTS public.ingest_ledger (
  file_hash          text PRIMARY KEY,        -- 파일 SHA-1 (또는 drive_file_id)
  drive_file_id      text,
  restaurant_folder  text NOT NULL,
  kind               text,
  status             text NOT NULL CHECK (status IN ('classified','menu_extracted','skipped','failed')),
  processed_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ingest_ledger_folder_idx ON public.ingest_ledger(restaurant_folder);

-- restaurants 보강 컬럼 ----------------------------------------
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS source            text;
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS needs_enrichment  boolean NOT NULL DEFAULT false;

-- RLS: 읽기 공개(기존 restaurants_read 와 동일 정책), 쓰기는 서버(service_role)만
ALTER TABLE public.restaurant_photos     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_features   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingest_ledger         ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS restaurant_photos_read     ON public.restaurant_photos;
DROP POLICY IF EXISTS restaurant_menu_items_read ON public.restaurant_menu_items;
DROP POLICY IF EXISTS restaurant_features_read   ON public.restaurant_features;
CREATE POLICY restaurant_photos_read     ON public.restaurant_photos     FOR SELECT USING (true);
CREATE POLICY restaurant_menu_items_read ON public.restaurant_menu_items FOR SELECT USING (true);
CREATE POLICY restaurant_features_read   ON public.restaurant_features   FOR SELECT USING (true);
-- ingest_ledger 는 운영 메타라 공개 읽기 정책을 두지 않는다 (service_role 전용).
