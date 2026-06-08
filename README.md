# Lunchie Munchie — Unified Feature Branch

**Lunchie Munchie**는 점심 메뉴 결정과 맛집 코스 탐색·편집·공유를 하나의 모바일 앱으로 연결하는 React Native + Expo 기반 프로토타입입니다. 이 통합 브랜치는 `hi-branch`, `data-jp`, `sj-branch`의 기능을 단일 Turborepo 모노레포로 정리하고, `TECH_STACK_REQUIREMENTS.md`를 기준으로 승인된 스택만 사용하도록 재구성했습니다.

## 통합 범위

| 영역 | 통합 내용 | 기준 브랜치 |
|---|---|---|
| Munchie Mode | 코스맵 에디터, 장소 순서 변경, 주변 장소 추가, 공유 화면 | hi-branch |
| Munchie Mode Data | 코스/식당/세션 데이터 모델, 코스 필터링, 공유 타입 | data-jp |
| Lunchie Mode | 예선전·결승전 스와이프 플로우, 결과 산정 | sj-branch |
| Lunchie Sharing | 친구 초대 링크, 결과 공유, Google Maps 이동 | hi-branch |
| Web Landing | 공유 링크 전용 Next.js 랜딩페이지 및 OG 메타데이터 | tech-stack requirement |
| Backend | Supabase PostgreSQL(PostGIS), RLS, Edge Functions 초안 | data-jp schema 기반 |

## 프로젝트 구조

```text
lunchie-munchie/
├── apps/
│   ├── mobile/       # React Native + Expo 메인 앱
│   └── web/          # 공유 링크 랜딩페이지 전용 Next.js
├── packages/
│   └── shared/       # 타입, mock 데이터, 필터링, 점수 산정, API 래퍼
├── supabase/
│   ├── migrations/   # PostgreSQL + PostGIS 스키마
│   └── functions/    # Edge Functions 초안
└── docs/             # tech stack, evaluation summary, reference landing image
```

## 실행 방법

```bash
pnpm install
pnpm check
pnpm mobile
pnpm web
```

## 주요 스택 준수 사항

이 브랜치는 모바일 앱을 중심으로 구현하며, 웹은 공유 링크 랜딩페이지에만 사용합니다. 클라이언트 상태는 Zustand, 서버 데이터 페칭·캐싱은 TanStack Query를 기준으로 분리했고, 공유 타입과 순수 로직은 `packages/shared`로 이동했습니다. 앱 핵심 기능을 Next.js에 구현하지 않았으며, Supabase/PostGIS 스키마와 Edge Functions는 백엔드 연결 준비물로 제공합니다.

## 현재 검증 상태

`pnpm check`가 `@lunchie-munchie/mobile`, `@lunchie-munchie/web`, `@lunchie-munchie/shared` 전체에서 성공했습니다.

## 브랜치

통합 브랜치명: `feature/unified-prototype-tech-stack`
