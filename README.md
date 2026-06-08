# 🍱 Lunchie Munchie — Unified Prototype (merge1)

> **오늘 어떻게 먹을까요?** 모드를 선택해주세요

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?logo=typescript)](https://typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-7-646CFF?logo=vite)](https://vitejs.dev)
[![Expo](https://img.shields.io/badge/Expo-Mobile-000020?logo=expo)](https://expo.dev)

## 🚀 Live Demo

[lunch-munchie-proto.manus.space](https://lunch-munchie-proto.manus.space)

## 📱 Two Modes

### ⚡ Lunchie Mode (Quick Match) — `sj_branch` + `hi_branch`

그룹 멤버들과 함께 음식 카드를 스와이프로 빠르게 메뉴를 결정해요.

**예선전 → 결승전 → 우승자** 토너먼트 플로우.

- 초대 링크 생성·공유, 마감 타이밍(5/10/15분)
- 예선전 9:12 카드 스와이프, 메뉴 사진 탭 패널
- 결승전 Top 2 대각선 VS 구도
- 우승자 — 구글 길찾기·예약·인스타 스토리 공유 (1080×1920)
- 세션 API (`data-jp`) — DB 기반 필터링·스와이프 집계

### 🗺️ Munchie Mode (Tour) — `hi_branch` + `data-jp`

맞춤형 코스를 추천받고 친구들과 투어를 즐겨요.

- 코스 피드 + 태그 필터 + **코스맵 오버레이** (`data-jp`)
- 코스 상세·에디터 (드래그 정렬) · Strava 스타일 공유 12종 (`hi_branch`)
- Expo 모바일 앱 — NativeWind 에디터 + IG 공유 (`mobile/`)

## 🛠️ Tech Stack

| Layer | 현재 (merge1) | 목표 ([TECH_STACK_REQUIREMENTS.md](./TECH_STACK_REQUIREMENTS.md)) |
|-------|---------------|-------------------------------------------------------------------|
| Web | React 19 + Vite 7 | `apps/web` Next.js (랜딩 전용) |
| Mobile | Expo + NativeWind (`mobile/`) | `apps/mobile` (메인 앱) |
| API | Express + Drizzle + Postgres | Supabase |
| State | React Context + localStorage | Zustand + TanStack Query |
| Animation | Framer Motion | Reanimated 3 |
| Map | Leaflet (웹) | Mapbox (앱) |
| Share | html-to-image | react-native-view-shot + Skia |

## 📚 Docs

- [Prototype Evaluation Summary](./docs/Prototype-Evaluation-Summary.md) — 2026-05-23 미팅 합의
- [Feature Spec](./docs/SPEC.md) — 통합 기능 명세
- [Wireframe Structure](./wireframe_structure.md) — UX 플로우
- [Tech Stack Requirements](./TECH_STACK_REQUIREMENTS.md) — 단일 기준 문서

## 🏃 Getting Started

```bash
pnpm install
pnpm dev          # Vite :5173 + API :3000
pnpm dev:client   # 프론트만 (mock 폴백)
pnpm seed         # DB 시드 (DATABASE_URL 필요)
```

`.env`에 `DATABASE_URL` 설정 시 API 모드, 미설정 시 mock 데이터로 동작.

## 🌿 Branch Integration (merge1)

| 브랜치 | 담당 기능 | 통합 내용 |
|--------|-----------|-----------|
| `sj_branch` | Lunchie 토너먼트 스와이프 | `QuickMatchPage.tsx` 풀 플로우 |
| `hi_branch` | 코스 에디터·IG 공유·모바일 | `course/*`, `mobile/`, 공유 템플릿 |
| `data-jp` | 스키마·필터링·API | `shared/schema.ts`, `server/routes.ts` |

## 📝 Changelog

### v4 — 전 브랜치 통합 (merge1)
- `hi_branch` + `sj_branch` + `data-jp` 기능 단일 브랜치 통합
- Drizzle/Postgres API 레이어 + mock 폴백 하이브리드 AppContext
- 코스 피드 코스맵 오버레이 추가
- Prototype Evaluation Summary → MD spec 정리
- TECH_STACK_REQUIREMENTS.md 프로젝트 반영

### v3 — sj_branch & tl_branch 병합
- Lunchie Mode 토너먼트 플로우 + 디자인 리뉴얼

### v2 — Lunchie Mode 풀 플로우
- 예선전/결승전/우승자, IG 스토리 공유, 구글 연동

### v1 — Web Prototype 초기 구축
- Quick Match / Tour Mode 2-모드 기본 구조
