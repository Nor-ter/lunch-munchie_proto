import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../shared/schema.js";
import dotenv from "dotenv";

// Load environment variables from .env
dotenv.config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn("⚠️ DATABASE_URL environment variable is not defined! Make sure it is set in your .env or Vercel dashboard.");
}

// Initialize postgres client (prepare: false is recommended for pooling like PgBouncer)
// connect_timeout(초)을 짧게 두어, DB가 일시정지/차단된 경우 API가 오래 멈추지
// 않고 빠르게 멜버른 샘플 데이터 폴백으로 넘어가도록 한다.
const client = postgres(connectionString || "", {
  prepare: false,
  connect_timeout: 2,
});

export const db = drizzle(client, { schema });

// ── DB 서킷 브레이커 ─────────────────────────────────────────────────────────
// DB(Supabase)가 죽어 있으면 postgres-js는 매 쿼리마다 새로 연결을 시도하며
// connect_timeout(초)을 통째로 지불한다. 세션/추천/폴링 한 요청이 순차 DB 호출을
// 여러 번 하므로 타임아웃이 누적돼(2초 × N) 초대 인식이 수 초씩 걸리게 된다.
//
// 브레이커는 "한 번 실패하면 쿨다운 동안 DB를 건너뛰고 즉시 폴백"으로 이 누적을
// 제거한다. 앱 부팅 시 /restaurants·/courses가 브레이커를 여는 순간부터 이후
// 세션/초대/결과 폴링이 전부 즉시(메모리·mock) 응답한다.
const DB_COOLDOWN_MS = 15_000; // 실패 후 이 시간 동안은 DB를 건너뛴다
let dbDownUntil = 0;

export function isDbDown(): boolean {
  return Date.now() < dbDownUntil;
}

function tripBreaker(err: unknown): void {
  dbDownUntil = Date.now() + DB_COOLDOWN_MS;
  console.error(
    `DB 사용 불가 → 서킷 오픈(${DB_COOLDOWN_MS / 1000}s 동안 폴백):`,
    (err as Error)?.message,
  );
}

function resetBreaker(): void {
  dbDownUntil = 0;
}

// DB 작업을 시도한다. 브레이커가 열려 있으면(최근 실패) DB를 건드리지 않고
// 곧바로 실패로 처리한다. 성공 시 브레이커를 닫고, 예외 시 브레이커를 연다.
// 반환: { ok: true, value } | { ok: false } (다운 또는 예외)
export async function tryDb<T>(
  op: () => Promise<T>,
): Promise<{ ok: true; value: T } | { ok: false }> {
  if (isDbDown()) return { ok: false };
  try {
    const value = await op();
    resetBreaker();
    return { ok: true, value };
  } catch (err) {
    tripBreaker(err);
    return { ok: false };
  }
}

// tryDb + 폴백 값. DB 경로가 실패(다운/예외)하면 fallback()을 반환한다.
export async function withDb<T>(
  op: () => Promise<T>,
  fallback: () => T | Promise<T>,
): Promise<T> {
  const r = await tryDb(op);
  return r.ok ? r.value : fallback();
}
