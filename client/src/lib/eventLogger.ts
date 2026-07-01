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

function send(events: RecEventInput[]): void {
  if (!events.length) return;
  const payload = JSON.stringify({ events });
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

export function flushEvents(): void {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  if (!queue.length) return;
  const batch = queue;
  queue = [];
  send(batch);
}

export function logEvent(event: RecEventInput): void {
  queue.push(event);
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
