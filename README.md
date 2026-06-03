# 🍱 Lunchie Munchie — Web Prototype

> **오늘 어떻게 먹을까요?** 모드를 선택해주세요

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?logo=typescript)](https://typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-7-646CFF?logo=vite)](https://vitejs.dev)

## 🚀 Live Demo
[lunch-munchie-proto.manus.space](https://lunch-munchie-proto.manus.space)

## 📱 Two Modes

### ⚡ Lunchie Mode (Quick Match)
그룹 멤버들과 함께 음식 카드를 스와이프로 빠르게 메뉴를 결정해요.

**예선전 → 결승전 → 우승자**로 이어지는 토너먼트 플로우.

- **초대 & 설정** — 초대 링크 생성 공유, 마감 타이밍(5/10/15분), 친구 목록
- **상세 설정** — 활성 옵션(식단/거리/예산/카드수/취향/평점)별 세부 태그 선택 → 레스토랑 필터 & 정렬에 반영
- **예선전(Swipe #1)** — 9:12 카드 스와이프, 카드 탭 시 다크 패널에서 메뉴 사진 세로 스크롤, 마감 카운트다운(만료 시 자동 종료)
- **결승전(Swipe #2)** — Top 2 대각선 split 구도 + VS 대결
- **우승자** — 상세 정보 · 메뉴 사진 · 구글 길찾기 · 구글 예약
- **인스타 스토리 공유 카드** — 1080×1920 이미지 생성 후 공유 / 저장
- **마감 차단** — 마감 시간이 지난 초대 링크는 참여 불가

### 🗺️ Tour Mode
맞춤형 코스를 추천받고 친구들과 투어를 즐겨요.

- 6가지 투어 타입 (카페/바/맛/데이트/나만의/핫플)
- 조건 설정 (시간/예산/인원/이동수단)
- 공유맵 (Leaflet + OpenStreetMap)
- Strava 스타일 SVG 코스맵 공유

## 🛠️ Tech Stack

| Layer | Tech |
|-------|------|
| Framework | React 19 + Vite 7 |
| Language | TypeScript 5.6 |
| Animation | Framer Motion |
| Map | Leaflet + OpenStreetMap |
| Image Capture | html-to-image |
| Styling | Tailwind CSS 4 |
| Icons | Lucide React |
| State | React Context + LocalStorage |

## 🎨 Design System

**Soft Coral** — `#EB5053` primary, `#F09D09` accent, `#3CBA44` success, `#FFF8F2` warm background

## 🏃 Getting Started

\`\`\`bash
pnpm install
pnpm dev
\`\`\`

## 📝 Changelog

### v2 — Lunchie Mode 풀 플로우 *(vibecoded with Claude Code)*
- 홈 화면을 디자이너 랜딩 시안(코랄/크림 톤)에 맞춰 리디자인, 레드 탭바(5탭)
- Lunchie Mode 토너먼트 플로우 구현 — 초대 링크 / 예선전 / 결승전(대각선) / 우승자
- 예선전 카드 탭 → 다크 패널 메뉴 사진 세로 스크롤
- 옵션 상세 설정 태깅 → 레스토랑 필터 & 정렬 반영
- 마감 카운트다운 + 만료된 초대 링크 차단
- 인스타 스토리(1080×1920) 공유 카드 생성 (html-to-image, 미리보기 후 공유/저장)
- 구글 길찾기 · 구글 예약 연동
- 레스토랑 mock 데이터 20종으로 확장

### v1 — Web Prototype 초기 구축 *(vibecoded with ChatGPT)*
- Quick Match / Tour Mode 2-모드 기본 구조
- 세션 코드 입력 방식, 기본 스와이프 카드, 결과 발표
- 6종 투어 타입 + 공유맵(Leaflet)
- Soft Coral 디자인 시스템 + shadcn/ui 컴포넌트 셋업
