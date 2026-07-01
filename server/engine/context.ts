// 런치 엔진 — 맥락 보강 (Phase 0b: 계측 갭 메우기)
//
// IMPRESSION 시점에 "파생 가능한" 맥락 필드를 서버에서 채운다.
// 클라이언트는 diet만 보내므로 time_of_day·day_of_week·city·weather가 비어 있었고,
// 데이터 신뢰성 패널이 이를 0%로 폭로했다 → 여기서 메운다.
//
// 설계 노트(엔진 설계 §5 FeatureProvider): weather는 교체 가능한 provider.
// 기본은 Open-Meteo(무키), 실패 시 캐시→null 폴백 (DB 폴백과 동일한 취지).

import type { RecContext } from "../../shared/engine.js";

export function deriveTimeOfDay(d: Date): NonNullable<RecContext["time_of_day"]> {
  const h = d.getHours();
  if (h < 11) return "morning";
  if (h < 14) return "lunch";
  if (h < 17) return "afternoon";
  if (h < 22) return "evening";
  return "late";
}

const DOW = ["일", "월", "화", "수", "목", "금", "토"];
export function deriveDayOfWeek(d: Date): string {
  return DOW[d.getDay()];
}

const DEFAULT_CITY = "Melbourne";
const MELB = { lat: -37.8136, lng: 144.9631 };
const WEATHER_TTL = 30 * 60 * 1000; // 날씨는 분 단위로 안 변함 → 30분 캐시
let weatherCache: { value: NonNullable<RecContext["weather"]>; at: number } | null = null;

// WMO weather_code + 기온 → food-relevant 버킷.
// 강수면 rain, 아니면 기온(추워서 뜨끈한 것 / 더워서 시원한 것)으로.
function toWeatherBucket(code: number, tempC: number): NonNullable<RecContext["weather"]> {
  const rainy = (code >= 51 && code <= 67) || (code >= 80 && code <= 82) || code >= 95;
  const snowy = code >= 71 && code <= 77;
  if (rainy) return "rain";
  if (snowy || tempC < 12) return "cold";
  if (tempC > 28) return "hot";
  return "clear";
}

// 교체 가능한 WeatherProvider — 기본 Open-Meteo(무키). 실패 시 캐시→null.
async function fetchWeather(lat: number, lng: number): Promise<NonNullable<RecContext["weather"]> | null> {
  if (weatherCache && Date.now() - weatherCache.at < WEATHER_TTL) return weatherCache.value;
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=weather_code,temperature_2m`;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 1500);
    const r = await fetch(url, { signal: ctrl.signal });
    clearTimeout(timer);
    if (!r.ok) return weatherCache?.value ?? null;
    const j = (await r.json()) as { current?: { weather_code?: number; temperature_2m?: number } };
    const code = j.current?.weather_code;
    const temp = j.current?.temperature_2m;
    if (typeof code !== "number" || typeof temp !== "number") return weatherCache?.value ?? null;
    const bucket = toWeatherBucket(code, temp);
    weatherCache = { value: bucket, at: Date.now() };
    return bucket;
  } catch (err) {
    console.error("WeatherProvider 불가, 폴백:", (err as Error)?.message);
    return weatherCache?.value ?? null;
  }
}

// IMPRESSION 시점 맥락 보강 — 클라가 안 보낸 파생 가능 필드를 채운다 (비파괴: 기존 값 유지).
export async function enrichContext(ctx: RecContext, now: Date = new Date()): Promise<RecContext> {
  const out: RecContext = { ...ctx };
  if (out.time_of_day == null) out.time_of_day = deriveTimeOfDay(now);
  if (out.day_of_week == null) out.day_of_week = deriveDayOfWeek(now);
  if (out.city == null) out.city = DEFAULT_CITY;
  if (out.weather == null) {
    const w = await fetchWeather(out.lat ?? MELB.lat, out.lng ?? MELB.lng);
    if (w) out.weather = w;
  }
  return out;
}
