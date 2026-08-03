// 런치 엔진 v0 — 클라이언트 이벤트 로거
// 스와이프/노출/방문 등 행동을 /api/events 로 전송한다.
// - 소량 배치 후 flush (네트워크 절약)
// - 페이지 이탈 시 sendBeacon 으로 유실 방지

import type { RecEventInput } from "@shared/engine";

const ENDPOINT = "/api/events";
const FLUSH_SIZE = 10;
const FLUSH_MS = 4000;

let queue: RecEventInput[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;

function sendAnonymous(payload: string): void {
  // 이탈 시점에도 안전하게 전송
  if (typeof navigator !== "undefined" && navigator.sendBeacon) {
    const ok = navigator.sendBeacon(ENDPOINT, new Blob([payload], { type: "application/json" }));
    if (ok) return;
  }

  fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload,
    keepalive: true,
  }).catch(() => {
    /* 로깅 실패는 UX를 막지 않는다 */
  });
}

async function send(events: RecEventInput[]): Promise<void> {
  if (!events.length) return;
  const payload = JSON.stringify({ events });
  // Cloudflare Pages Function reads the signed same-origin session cookie.
  // No browser access token is persisted or attached to analytics requests.
  sendAnonymous(payload);
}

export function flushEvents(): void {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  if (!queue.length) return;
  const batch = queue;
  queue = [];
  void send(batch);
}

export function logEvent(event: RecEventInput): void {
  // 같은 객체가 pagehide와 timer flush에 함께 걸려도 서버가 한 번만 기록하게 한다.
  // user_id는 서버 세션에서 다시 결정하므로 이 키는 개인 식별 정보를 담지 않는다.
  queue.push({
    ...event,
    idempotency_key: event.idempotency_key ?? crypto.randomUUID(),
  });
  if (queue.length >= FLUSH_SIZE) {
    flushEvents();
    return;
  }
  if (!timer) timer = setTimeout(flushEvents, FLUSH_MS);
}

// 페이지 이탈 시 남은 큐 비우기
if (typeof window !== "undefined") {
  window.addEventListener("pagehide", flushEvents);
  window.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushEvents();
  });
}

// 편의 헬퍼
export const logSwipe = (
  restaurant_id: string,
  action: "LIKE" | "NOPE",
  extra: Partial<RecEventInput> = {}
) => logEvent({ event_type: "SWIPE", restaurant_id, action, ...extra });

export const logWinner = (restaurant_id: string, extra: Partial<RecEventInput> = {}) =>
  logEvent({ event_type: "WINNER", restaurant_id, ...extra });

export const logNavigate = (restaurant_id: string, extra: Partial<RecEventInput> = {}) =>
  logEvent({ event_type: "NAVIGATE", restaurant_id, ...extra });

/** 가입에서 사용자가 명시적으로 선택한 제약만 기록한다. 선택하지 않은 값은 추론하지 않는다. */
export const logOnboardingCompleted = (diet: string[]) =>
  logEvent({
    event_type: "ONBOARDING_COMPLETED",
    context: { diet, onboarding_version: "v1", location_permission: "deferred" },
  });

/** Lunchie 세션 조건은 이번 결정의 맥락이며, 개인 장기 취향 벡터에는 직접 학습하지 않는다. */
export const logSessionCreated = (session_id: string, context: Record<string, unknown>) =>
  logEvent({ event_type: "SESSION_CREATED", session_id, context });

// Munchie 피드 및 코스 연동 헬퍼
export const logFeedLike = (course_id: string, isLiked: boolean, extra: Partial<RecEventInput> = {}) =>
  logEvent({
    event_type: isLiked ? "FEED_LIKE" : "FEED_DISLIKE",
    course_id,
    slate_type: "COURSE_FEED",
    ...extra,
  });

export const logCourseSave = (course_id: string, extra: Partial<RecEventInput> = {}) =>
  logEvent({
    event_type: "COURSE_SAVE",
    course_id,
    slate_type: "COURSE_FEED",
    ...extra,
  });

export const logCourseOpen = (course_id: string, extra: Partial<RecEventInput> = {}) =>
  logEvent({
    event_type: "COURSE_OPEN",
    course_id,
    slate_type: "COURSE_FEED",
    ...extra,
  });

export const logCourseFeedImpression = (course_id: string, dwell_ms?: number, extra: Partial<RecEventInput> = {}) =>
  logEvent({
    event_type: "IMPRESSION",
    course_id,
    slate_type: "COURSE_FEED",
    dwell_ms,
    ...extra,
  });
