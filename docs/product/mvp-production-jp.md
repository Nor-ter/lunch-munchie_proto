# MVP Production JP delivery contract

## Feature

- Outcome: 음식 사진 중심의 코스 발견 → 서버 저장 → 길찾기 → 방문 일지 게시 루프를 프로덕션 품질로 제공한다.
- Source: `codex/mvp-munchie-feed-reset` at `5a59306b`.
- Working branch: `mvp-production-jp`.
- Delivery: 이 브랜치에서만 구현하고 사용자의 별도 요청 전에는 PR을 만들거나 `main`에 병합하지 않는다.

## Product invariants

- 식당 한 곳도 `1곳 코스`이며, 식당과 코스를 별도 저장 유형으로 나누지 않는다.
- 코스는 재사용 가능한 계획이고 방문 일지는 그 코스를 사용한 작성자 소유의 기록이다.
- 저장·게시·반응의 원본은 서버이며 브라우저 캐시로 소유권이나 권한을 판단하지 않는다.
- 대표 사진은 게시 작성자가 소유하고 해당 게시물에 연결한 R2 미디어만 사용한다.
- 다른 사용자 또는 식당 카탈로그 사진을 게시물 대표 사진으로 대체하지 않는다.
- 가격·메뉴·거리·시간은 근거가 있는 구조화 데이터만 표시하며 임의 추정값을 만들지 않는다.
- 정확한 사진 GPS는 서버에 저장하지 않는다. 사진 위치 분석은 명시적 동의 후 기기에서 수행하고 사용자가 귀속을 확인한다.

## Photo story overlay carousel

- Outcome: 작성자가 올린 대표 음식 사진을 한 장씩 넘겨 보면서, 각 사진에 코스맵·음식명·식당명·가격·한줄평·자유 텍스트를 독립적으로 배치하는 Strava 스타일의 정보 오버레이 피드를 제공한다.
- 사진 한 장은 하나의 안정적인 슬라이드이며 슬라이드 순서와 오버레이는 D1 서버 원본으로 저장한다.
- 피드·게시물 상세·내 프로필·다른 사용자 프로필은 같은 canonical `storySlides`를 렌더링한다.
- 슬라이드는 작성자가 이 게시물에 업로드한 `course_media`만 참조한다. 식당 카탈로그나 다른 사용자의 사진은 대체 이미지 또는 편집 후보가 될 수 없다.
- 오버레이는 허용된 구조화 타입과 스타일 프리셋만 저장하며 임의 HTML, CSS, 스크립트, 외부 URL을 허용하지 않는다.
- 슬라이드는 게시물당 최대 6장, 오버레이는 슬라이드당 최대 6개다. 위치와 너비는 0–100 정규화 좌표 안으로 제한한다.
- 가격은 작성자가 입력한 값만 표시하고, 음식명·식당명·한줄평도 슬라이드별로 독립 저장한다.
- 코스맵은 게시물의 실제 stop 순서를 사용한다. 좌표가 없어도 장소 순서를 보여 주는 schematic으로 대체한다.
- 수평 swipe는 슬라이드를 이동하고 수직 drag는 피드 스크롤을 유지한다. swipe는 더블탭 좋아요로 오인되지 않아야 한다.
- 이전/다음 버튼, 현재 위치 표시, ArrowLeft/ArrowRight와 carousel ARIA를 제공한다.
- 깨진 사진은 해당 슬라이드의 명시적인 빈 상태로 남으며 다른 슬라이드의 사진으로 조용히 치환하지 않는다.
- 기존 게시물은 검증된 작성자 사진마다 기본 슬라이드를 만들어 이전 UI와 데이터 호환성을 유지한다.

### Overlay acceptance criteria

- [x] 작성자는 썸네일에서 사진을 선택하고 그 사진에만 오버레이를 추가·이동·수정·삭제할 수 있다.
- [x] 코스맵, 음식명, 식당명, 가격, 한줄평, 자유 텍스트를 각각 추가할 수 있다.
- [x] 슬라이드 A의 오버레이 변경이 슬라이드 B에 섞이지 않는다.
- [x] 게시 후 새로고침하거나 다른 기기·다른 계정에서 보아도 사진 순서와 오버레이가 같다.
- [x] 첫 사진만 eager load하고 이후 사진은 lazy load한다.
- [x] 320px 폭에서도 오버레이와 캐러셀 조작으로 가로 페이지 overflow가 생기지 않는다.

### Overlay non-goals

- 임의 폰트 업로드, 자유 CSS/HTML, 영상 슬라이드
- 메뉴 OCR, 영수증 자동 가격 인식, 음식 이미지 자동 판별
- 오버레이를 사진 픽셀에 영구 합성하는 방식

## Two-week MVP acceptance criteria

- [x] 피드 첫 화면에서 대표 음식 사진과 1곳/여러 곳 코스 요약을 즉시 이해할 수 있다.
- [x] 피드, 게시물 상세, 작성자 프로필이 같은 서버 게시물과 같은 미디어를 렌더링한다.
- [x] 저장은 로그인 계정의 D1 `saved_courses`를 원본으로 사용하고 새로고침·다른 기기에서 유지된다.
- [x] 저장 화면에서 제목·식당·지역을 검색하고 최근순/가까운순으로 정렬할 수 있다.
- [x] 한 곳 또는 여러 장소 코스를 Google Maps 길찾기로 열 수 있으며 작성된 장소 순서를 보존한다.
- [x] 저장 코스 또는 새 코스에서 식당 목록 → 사진 귀속 → 한줄평/태그 → 게시 순서로 완료할 수 있다.
- [x] EXIF가 없거나 위치 분석을 거부해도 수동 귀속으로 게시할 수 있다.
- [x] 게시물 삭제 후 피드·프로필·D1·R2에서 다시 나타나지 않는다.
- [x] 동일 저장/게시/삭제 요청 재시도가 중복 데이터나 중복 보상을 만들지 않는다.
- [x] 익명 탐색과 로그인 후 원래 행동 복귀를 보존한다.

자동화된 수용 조건은 이 브랜치에서 충족했다. 실제 Google 계정·기기 권한이 필요한
전화기 수동 확인과 Cloudflare 운영 migration/배포는 사용자의 별도 승인 전까지 남겨 둔다.

## Scope

### UI

- 음식 hero 중심의 피드 카드와 근거 있는 코스 오버레이
- 코스 상세의 장소 순서, 저장, Google Maps 길찾기
- 서버 저장 목록의 list/map/search/sort
- 저장 코스 재사용이 가능한 restaurant-first 방문 일지 작성기
- 위치 분석 동의, 자동 제안, 수동 확인 상태

### API and types

- 단건 코스/게시물 조회
- 멱등적인 saved-course GET/PUT/DELETE
- 대표 미디어·풍부한 stop·경로 요약을 가진 canonical course/feed DTO
- 소유자 media asset만 연결할 수 있는 게시 계약
- 허용 필드만 받는 추천 이벤트 계약

### D1 and R2

- 기존 migration을 수정하지 않고 새로운 순번 migration만 추가한다.
- `courses`/`course_items`는 재사용 가능한 계획으로 유지한다.
- 방문 일지는 `source_course_id`와 게시 당시 stop snapshot을 가진 별도 서버 레코드로 확장한다.
- R2 asset의 소유권·상태·참조·삭제를 D1에서 추적한다.
- staged upload 정리와 참조 없는 R2 object 삭제를 재시도 가능하게 만든다.

### Cloudflare deployment

- 로컬 D1 fresh migration과 기존 DB upgrade migration을 모두 검증한다.
- Pages Functions, D1, R2 binding 이름을 유지한다.
- secret과 `.dev.vars`를 커밋하지 않는다.
- 사용자의 별도 요청 전에는 이 브랜치를 배포하지 않는다.

### Protected behavior

- Google OAuth와 서버 세션
- 익명 피드 탐색
- 작성자/관리자 삭제 권한
- 8개 단위 피드 pagination과 추천 다양성
- 프로필의 canonical author feed
- 기존 운영 코스·게시물·사진 데이터

## Non-goals for this delivery

- Lunchie 실시간 그룹 투표와 초대 기능 재설계
- ML 자동 학습 완료 주장
- 영수증 OCR과 음식 이미지 분류 모델
- 공개 leaderboard 또는 거래 가능한 게임 경제
- Google Maps를 대체하는 자체 턴바이턴 내비게이션
- 기존 운영 데이터를 초기화하거나 이미 적용된 migration을 다시 작성하는 작업

## Delivery slices

1. Canonical course summary, single-resource API, server saved courses
2. Decision-first feed card and consistent detail/profile rendering
3. Google Maps single/multi-stop handoff
4. Saved course list/map/search/sort
5. Course-first journal composer and photo attribution consent
6. Media ownership, deletion lifecycle, event allowlist
7. Stabilization: migration, focused tests, full gate, mobile sign-off

## Validation

- Focused Vitest for every changed API/helper/component
- Local D1 migration and seed smoke test
- Playwright: anonymous feed, login continuation, save→detail→route, saved course→journal→publish, profile/feed consistency, deletion ownership
- Full gate before a delivery checkpoint: Cloudflare policy, TypeScript, Vitest, Playwright, production build
- Manual phone verification for Google Maps handoff, location denial, image fallback, and post deletion

## Migration order and rollback

1. Apply additive schema and deploy backward-compatible reads.
2. Backfill deterministic identifiers with an idempotent migration/script.
3. Enable server writes behind a narrow feature flag.
4. Switch reads after consistency checks.
5. Remove legacy reads only in a later release.

Rollback disables the new UI/read path and retains additive tables and columns. It never drops operating data or rewrites applied migration history.
