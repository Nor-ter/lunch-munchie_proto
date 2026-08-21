-- Google Places에서 가져온 장소가 음식 관련 장소인지 캐시에서도 재검증한다.
ALTER TABLE restaurants ADD COLUMN place_types TEXT NOT NULL DEFAULT '[]';
