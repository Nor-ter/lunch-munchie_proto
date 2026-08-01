# Lunchie Munchie — 통합 Feature Spec (merge1)

> **기준 문서:** [Prototype-Evaluation-Summary.md](./Prototype-Evaluation-Summary.md) · [TECH_STACK_REQUIREMENTS.md](../TECH_STACK_REQUIREMENTS.md) · [wireframe_structure.md](../wireframe_structure.md)

---

## 앱 개요

**Lunchie Munchie** — 점심/맛집 코스를 탐색·편집·공유하고, 그룹과 함께 메뉴를 빠르게 결정하는 2-모드 앱.

| 모드 | 설명 | 핵심 플로우 |
|------|------|-------------|
| **Lunchie Mode** | Quick Match — Tinder 스타일 스와이프 | 초대 → 예선전 → 결승전 → 우승자 → 공유 |
| **Munchie Mode** | 코스 탐색·편집·공유 | 피드 → 상세 → 에디터 → 인스타 공유 |

---

## 화면 구조 (Static Wire)

### 공통
- **홈** — 모드 선택 (Lunchie / Munchie), 추천 코스 피드
- **탭바** — 홈 · 피드 · 코스만들기 · 저장 · 프로필

### Lunchie Mode
1. `QuickMatchPage` — 초대·설정 / 예선전(9:12 카드) / 결승전(VS) / 우승자
2. `SessionCreatePage` — 그룹 세션 생성 (인원·식단·예산·반경·카테고리)
3. `SessionLobbyPage` — 멤버 대기·초대 코드
4. 결과 공유 — IG 스토리 1080×1920, 구글 길찾기·예약

### Munchie Mode
1. `ExplorePage` — 코스 피드 + 태그 필터 + **코스맵 오버레이**
2. `course/CourseDetailPage` — 코스 상세·경로·장소 리스트
3. `course/CourseEditPage` — 드래그 정렬·장소 추가·시간 편집
4. `course/CourseSharePage` — Strava 스타일 공유 템플릿 12종
5. `CourseNavigatePage` — 구글맵 길찾기

### Mobile (Expo — `mobile/`)
- `app/course/[id]/edit.tsx` — NativeWind 코스맵 에디터
- `app/course/[id]/share.tsx` — view-shot + expo-sharing IG 공유

---

## Dynamic Wire (인터랙션)

| 동작 | 구현 | 파일 |
|------|------|------|
| 카드 스와이프 (예선·결승) | Framer Motion drag | `QuickMatchPage.tsx` |
| 카드 탭 → 메뉴 사진 스크롤 | AnimatePresence 패널 | `QuickMatchPage.tsx` |
| 마감 카운트다운 | setInterval + 자동 종료 | `QuickMatchPage.tsx` |
| 코스 순서 드래그 | @dnd-kit | `CourseEditPage.tsx` |
| 공유 카드 PNG 생성 | html-to-image | `CourseSharePage.tsx` |
| 세션 API (생성·참여·스와이프) | Express `/api/sessions` | `server/routes.ts` |
| DB 필터링·결과 집계 | Drizzle + Postgres | `shared/schema.ts` |

---

## API 엔드포인트 (`/api`)

| Method | Path | 설명 |
|--------|------|------|
| GET | `/restaurants` | 식당 목록 (필터용) |
| GET | `/courses` | 코스 + stops |
| POST | `/sessions/create` | 세션 생성 |
| GET | `/sessions/:token` | 세션 조회 |
| POST | `/sessions/:token/join` | 참여 |
| POST | `/sessions/:token/ready` | 준비 토글 |
| POST | `/sessions/:token/status` | 상태 변경 |
| GET | `/sessions/:token/results` | 스와이프 결과 집계 |
| POST | `/swipes` | 스와이프 기록 |

---

## 데이터 스키마

`shared/schema.ts` — Drizzle ORM (Postgres)

- `users`, `restaurants`, `courses`, `course_items`
- `sessions`, `session_members`, `swipes`

> **마이그레이션 목표:** Supabase PostgreSQL + PostGIS ([TECH_STACK_REQUIREMENTS.md](../TECH_STACK_REQUIREMENTS.md) §2-2)

---

## 환경 변수

```bash
# .env (서버)
DATABASE_URL=postgresql://...

# .env (클라이언트 — 선택)
VITE_FRONTEND_FORGE_API_KEY=   # Google Maps proxy
```

---

## 실행

```bash
pnpm install
pnpm dev          # Vite :5173 + API :3000 (concurrently)
pnpm seed         # DB 시드 (DATABASE_URL 필요)
pnpm check        # TypeScript 검사
```

API 없이도 mock 데이터로 클라이언트 단독 동작 (`apiAvailable: false` 폴백).
