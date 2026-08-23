// 런치 엔진 v0 — 공유 타입 (server + client 공용)
// Phase 0: 로깅 + propensity 스캐폴딩의 계약(contract)을 한 곳에 모은다.

import type { Intent } from "./intent.js";

export const EVENT_TYPES = [
  "ONBOARDING_COMPLETED", // 가입 시 사용자가 직접 고른 안전 제약·초기 관심사 (추천 점수에는 미반영)
  "SESSION_CREATED",     // Lunchie 한 번의 의사결정 맥락; 장기 취향이 아닌 요청 조건
  "IMPRESSION", // 추천 카드 노출 (propensity 기록 대상)
  "SWIPE",      // like / nope
  "WINNER",     // 우승 식당 확정
  "NAVIGATE",   // 길찾기/상세 진입
  "VISIT",      // 실제 방문 (가능 시)
  "REORDER",    // 재주문/재소비
  "COURSE_SAVE",// 추천 코스 저장 (명시 신호)
  "COURSE_EDIT",// 추천 코스 수정 (연쇄 선호 신호)
  "FEED_LIKE",  // Munchie 피드 좋아요 (열망 신호 w=0.25)
  "FEED_DISLIKE",// Munchie 피드 싫어요 (열망 신호 w=-0.25)
  "COURSE_OPEN",// Munchie 코스 상세 열람 (관심 신호 w=0.1)
  "REROLL",     // 다시하기 (불만족·피로 신호)
  "SURVEY",     // 회고 마이크로설문 (action: POS|NEU|NEG = 👍😐👎, 만족 정답)
  "ABANDON",    // 중도 이탈 (결정 전 나감 · context: phase·swipes_done = 어디서 몇 장 보고)
  "NO_CONSENSUS", // 그룹 합의 실패 (reroll 상한 초과 · 슬레이트 품질↓·탐색 필요 신호)
] as const;
export type EventType = (typeof EVENT_TYPES)[number];

// 추천 시점의 맥락 스냅샷 (스코어러 입력 + 이벤트 로그에 함께 저장)
export interface RecContext {
  time_of_day?: "morning" | "lunch" | "afternoon" | "evening" | "late";
  day_of_week?: string; // 요일 (서버 파생)
  weather?: "clear" | "rain" | "cold" | "hot";
  minutes_since_meal?: number;
  companions?: number; // 동행 인원 (1 = 혼자)
  intent?: Intent; // 하루 여정: 밥/카페/디저트 — recommend 카테고리 필터
  city?: string; // 도시 (lat/lng 또는 기본값에서 파생)
  lat?: number;
  lng?: number;
  diet?: string[];
  /** User-selected price ceiling (₩…₩₩₩₩). Enforced only with menu-price evidence. */
  budget?: 1 | 2 | 3 | 4;
}

// 스코어러 입력 후보 (레스토랑 최소 피처)
export interface Candidate {
  id: string;
  rating?: number;
  review_count?: number;
  price_level?: number;
  category?: string;
  dietary_options?: string[];
  /** Structured menu-section evidence, never inferred from a venue name. */
  menu_intents?: Intent[];
  /** Raw structured menu entries used for ingredient-level dietary evidence. */
  menu_items?: unknown;
}

// 스코어러 출력 — 실제로 보여줄 슬레이트 한 칸
export interface ScoredItem {
  id: string;
  score: number;       // 모델 점수
  propensity: number;  // 이 아이템을 보여줄 확률 (off-policy 평가용)
  rank: number;        // 슬레이트 내 순위 (0-based)
}

// 클라이언트→서버로 보내는 이벤트 입력
export type SlateType = "PRELIM" | "FINAL" | "NEXT_STOP" | "COURSE_FEED";

export interface RecEventInput {
  /** 브라우저 재전송/중복 flush에도 한 번의 행동만 저장하기 위한 클라이언트 생성 키 */
  idempotency_key?: string | null;
  event_type: EventType;
  slate_id?: string | null;
  slate_type?: SlateType | null;
  user_id?: string | null;
  course_id?: string | null;
  session_id?: string | null;
  group_id?: string | null;
  restaurant_id?: string | null;
  round?: number | null;
  position?: number | null;
  action?: string | null;       // 예: "LIKE" | "NOPE"
  propensity?: number | null;
  score?: number | null;
  model_version?: string | null;
  variant?: string | null;      // A/B 변형
  dwell_ms?: number | null;
  // 추천 맥락 또는 이벤트 메타(예: ABANDON의 phase·swipes_done, WINNER의 decision_time_ms)
  context?: RecContext | Record<string, unknown> | null;
}

export const ENGINE_MODEL_VERSION = "v0-heuristic";
