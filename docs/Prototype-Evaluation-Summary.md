# Prototype Evaluation Summary

> **미팅 일자:** 2026-05-23  
> **참석:** Inseong.H (HI), Jongho.P (JP), Seungyeon.J (SJ), Taehoon.L (TL)  
> **목적:** Conceptual Prototype 평가 후, 통합 개발 방향 및 우선순위 확정

---

## 1. What to Keep (유지)

| 항목 | 담당 | 비고 |
|------|------|------|
| 코스맵 에디터 + 인스타 공유 | HI (#1) | Claude Code / Cursor |
| 코스맵 필터링 + 데이터 스키마 | JP (#2) | Claude Code / Gemini |
| Lunchie Mode 초대·스와이프·결과 공유 | SJ, TL (#3·4) | Claude Code / OpenAI Codex |
| 네비게이션 바 디자인 | #3·4 | 긍정 피드백 |
| 카드 디자인 / 스와이프 카드 레이아웃 | #3·4 | 음식 카드 구도 유지 |
| 결과 공유 페이지 & 공유 카드 | #3·4 | 품질 우수 |
| 코스 순서 표시 컬러 | #2 | 잘 보임 |
| 전체 UX 직관성 | #2 | 직관적 |
| 코스맵 에디터 기능 | #1 | 핵심 기능 |

---

## 2. What to Remove / Change (제거·변경)

| 항목 | 담당 | 조치 |
|------|------|------|
| 노란색(Yellow) 컬러 | #3·4 | 브랜드 아이덴티티 **레드 톤**으로 통일 |
| 결과 발표·QR·세션 화면 (보드 #2) | #3·4 | Replace 표시 → 전면 교체 |
| 현재 로고 (2종 혼재) | #3·4 | 단일 브랜드 로고로 통합 |
| 숫자 컬러 / 아이콘 / 전체 UI | #1 | 개선·리디자인 |
| 점수 노출 방식 | #2 | 유저에게 이득인지 재검토 |

---

## 3. What to Add (추가)

| 항목 | 담당 | 상세 |
|------|------|------|
| QR & 링크 공유 기능 | #2·3·4 | 초대·결과 공유 |
| 코스맵 필터링 기능 | #3·4 | 태그·지역·거리 등 |
| 코스 저장 기능 | #2 | 찜·북마크 |
| 사진 위 코스맵 오버레이 | #2 | 피드 카드에 경로 표시 |
| 인스타 피드형 코스맵 뷰 | #2 | 보드 필드·ID 포함 |
| 오뚜기 마스코트 모션 | #3·4 | 인트로·로딩 |
| 거리 수치 표시 | #1 | km/m 단위 |
| 9:12 / 9:16 비율 선택 | #1·3·4 | 공유 시 비율 옵션 |
| 메뉴 사진 탭 전환 | #3·4 | 좌·우 탭으로 사진 넘기기 |
| 결승전 브래킷 + 트로피 로고 | #3·4 | Lunchie Mode 결과 화면 |
| 음식 아이콘 세트 | #1 | 카테고리별 아이콘 |

---

## 4. 기타 논의 사항

| 항목 | 담당 | 상세 |
|------|------|------|
| 와이어프레임 상세화 | #1 | 최종본 수준으로 커맨드에 포함 |
| 레퍼런스 — Strava | #1 | 프로덕션 퀄리티 목표 |
| 실데이터 테스트 | #1 | JP 멤버 샘플 12곳, 3·4·5코스 케이스 검증 |
| 순서 변경 알고리즘 | #1 | 드래그 시 코스맵 동적 업데이트 |
| 랜딩페이지 | #3·4 | design.md 스펙 반영 |
| 앱 구현 검토 | #1 | 웹 + 네이티브 앱 병행 |

---

## 5. 브랜치별 코어 기능 매핑 (통합 기준)

| 모드 | 기능 | 브랜치 | 통합 상태 |
|------|------|--------|-----------|
| **Munchie Mode** | 코스맵 에디터 | `hi_branch` | ✅ `client/pages/course/`, `mobile/app/course/` |
| **Munchie Mode** | 인스타 공유 템플릿 | `hi_branch` | ✅ Strava 스타일 12종 템플릿 |
| **Munchie Mode** | 코스맵 필터링·스키마 | `data-jp` | ✅ `shared/schema.ts`, API `/api/courses` |
| **Lunchie Mode** | 예선전·결승전 스와이프 | `sj_branch` | ✅ `QuickMatchPage.tsx` 토너먼트 플로우 |
| **Lunchie Mode** | 친구 초대·결과 공유·구글맵 | `hi_branch` + `sj_branch` | ✅ 초대 링크, IG 스토리, 길찾기 |

---

## 6. Tech Stack 마이그레이션 방향

현재 `merge1` 브랜치는 **Vite 웹 프로토타입** 단계이며, [TECH_STACK_REQUIREMENTS.md](../TECH_STACK_REQUIREMENTS.md)에 정의된 목표 스택으로 점진 이전한다.

| 현재 (프로토타입) | 목표 (프로덕션) |
|-------------------|-----------------|
| Vite + React 19 | Turborepo 모노레포 |
| Leaflet (웹) | `@rnmapbox/maps` (앱) |
| html-to-image | `react-native-view-shot` + Skia |
| Express + Drizzle + Postgres | Supabase (PostgreSQL) |
| `client/` 단일 앱 | `apps/mobile` (Expo) + `apps/web` (랜딩 전용) |
| 로컬 mock + API | TanStack Query + Zustand 분리 |

**우선순위 (미팅 합의 반영):**
1. 브랜드 컬러 레드 톤 통일, 노란색 제거
2. QR·링크 공유 완성
3. 코스맵 오버레이·필터링 UX
4. Expo 앱(`mobile/`)으로 코어 기능 이전
5. Supabase 스키마 마이그레이션 (`shared/schema.ts` → `packages/shared`)

---

## 7. Task Assign (팀원별 Focus)

| 멤버 | Focus | 담당 영역 |
|------|-------|-----------|
| **개발 (HI)** | 기능 작동·최적화 | 코스맵 에디터, 공유 파이프라인, Expo 앱 |
| **데이터 (JP)** | 스키마·필터링 | `shared/schema.ts`, API, Supabase 마이그레이션 |
| **디자인 (TL)** | 시각·컬러톤 | Soft Coral 리디자인, Strava 레퍼런스, 아이콘 |
| **프로덕트 (SJ)** | 유저 편의성 | Lunchie 토너먼트 UX, 초대·결과 공유 플로우 |
