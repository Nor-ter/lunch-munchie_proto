// 런치 엔진 v0 — 이벤트 기록 (DB 우선, 실패 시 인메모리 폴백)
//
// routes.ts의 세션/식당 폴백과 동일한 취지: Supabase가 일시정지/차단돼도
// 로깅이 앱을 막지 않도록 한다. 인메모리 버퍼는 개발/장애 시 임시 보관용.

import { db } from "../db.js";
import { recEvents } from "../../shared/schema.js";
import type { RecEventInput } from "../../shared/engine.js";
import { nanoid } from "nanoid";

const MEM_CAP = 5000;
const memEvents: Record<string, unknown>[] = [];

export function memEventCount(): number {
  return memEvents.length;
}

// 대시보드용 집계 (dev: 인메모리 버퍼 기준; 프로덕션은 rec_events 쿼리로 대체 예정)
export function getMetrics() {
  const ev = memEvents as Array<Record<string, unknown>>;
  const byType: Record<string, number> = {};
  const bySlate: Record<string, number> = {};
  let like = 0, nope = 0, choose = 0, impressions = 0, propSum = 0;
  for (const e of ev) {
    const t = String(e.event_type ?? "?");
    byType[t] = (byType[t] ?? 0) + 1;
    if (e.slate_type) {
      const s = String(e.slate_type);
      bySlate[s] = (bySlate[s] ?? 0) + 1;
    }
    if (e.action === "LIKE") like++;
    else if (e.action === "NOPE") nope++;
    else if (e.action === "CHOOSE") choose++;
    if (e.event_type === "IMPRESSION") {
      impressions++;
      if (typeof e.propensity === "number") propSum += e.propensity;
    }
  }
  return {
    total: ev.length,
    byType,
    bySlate,
    swipes: { like, nope, acceptance: like + nope > 0 ? like / (like + nope) : null },
    duels: choose,
    impressions,
    avgPropensity: impressions > 0 ? propSum / impressions : null,
  };
}

function toRow(e: RecEventInput) {
  return {
    id: nanoid(),
    event_type: e.event_type,
    slate_id: e.slate_id ?? null,
    slate_type: e.slate_type ?? null,
    user_id: e.user_id ?? null,
    session_id: e.session_id ?? null,
    group_id: e.group_id ?? null,
    restaurant_id: e.restaurant_id ?? null,
    round: e.round ?? null,
    position: e.position ?? null,
    action: e.action ?? null,
    propensity: e.propensity ?? null,
    score: e.score ?? null,
    model_version: e.model_version ?? null,
    variant: e.variant ?? null,
    dwell_ms: e.dwell_ms ?? null,
    context: (e.context ?? null) as Record<string, unknown> | null,
    created_at: new Date(),
  };
}

export async function recordEvents(
  events: RecEventInput[]
): Promise<{ ok: boolean; count: number; persisted: boolean }> {
  if (!events?.length) return { ok: true, count: 0, persisted: false };
  const rows = events.map(toRow);
  try {
    await db.insert(recEvents).values(rows);
    return { ok: true, count: rows.length, persisted: true };
  } catch (err) {
    console.error("DB unavailable for rec_events, buffering in memory:", (err as Error)?.message);
    for (const r of rows) {
      memEvents.push(r);
      if (memEvents.length > MEM_CAP) memEvents.shift();
    }
    return { ok: true, count: rows.length, persisted: false };
  }
}
