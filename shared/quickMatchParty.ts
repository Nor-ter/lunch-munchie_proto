export const QUICK_MATCH_PARTY_SIZE_MIN = 1;
export const QUICK_MATCH_PARTY_SIZE_MAX = 30;
export const QUICK_MATCH_PARTY_SIZE_DEFAULT = 4;

export function normalizeQuickMatchPartySize(
  value: unknown,
  fallback = QUICK_MATCH_PARTY_SIZE_DEFAULT,
): number {
  if (value === null || value === undefined || value === '') return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(
    QUICK_MATCH_PARTY_SIZE_MIN,
    Math.min(QUICK_MATCH_PARTY_SIZE_MAX, Math.round(parsed)),
  );
}
