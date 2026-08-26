export type LunchmateVisibility = "public" | "private";

export interface LunchmateProfileLoadoutRecord {
  outfit: string | null;
  headwear: string | null;
  eyewear: string | null;
  bag: string | null;
}

export interface LunchmateRoomConfigRecord {
  wallpaperId: string;
  floorId: string;
  furnitureId: string | null;
  propsId: string | null;
}

export interface LunchmateProfileRow {
  foodie_char?: unknown;
  foodie_skin?: unknown;
  lunchmate_loadout?: unknown;
  lunchmate_room_loadout?: unknown;
  lunchmate_visibility?: unknown;
}

export interface PublicLunchmateProfile {
  visibility: LunchmateVisibility;
  character: string | null;
  skin: string | null;
  loadout: LunchmateProfileLoadoutRecord | null;
  roomConfig: LunchmateRoomConfigRecord | null;
}

export interface LunchmateProfilePatch {
  character?: string | null;
  skin?: string | null;
  loadout?: LunchmateProfileLoadoutRecord | null;
  roomConfig?: LunchmateRoomConfigRecord | null;
  visibility?: LunchmateVisibility;
}

const LOADOUT_KEYS = ["outfit", "headwear", "eyewear", "bag"] as const;
const ROOM_KEYS = ["wallpaperId", "floorId", "furnitureId", "propsId"] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function nullableIdentifier(value: unknown): string | null | undefined {
  if (value === null) return null;
  if (typeof value !== "string") return undefined;
  const normalized = value.trim();
  return normalized.length > 0 && normalized.length <= 100 ? normalized : undefined;
}

function parseJsonRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "string" || !value) return null;
  try {
    const parsed = JSON.parse(value) as unknown;
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function normalizeLunchmateLoadout(value: unknown): LunchmateProfileLoadoutRecord | null {
  const record = typeof value === "string" ? parseJsonRecord(value) : isRecord(value) ? value : null;
  if (!record) return null;
  const normalized = {} as LunchmateProfileLoadoutRecord;
  for (const key of LOADOUT_KEYS) {
    const item = nullableIdentifier(record[key]);
    if (item === undefined) return null;
    normalized[key] = item;
  }
  return normalized;
}

export function normalizeLunchmateRoomConfig(value: unknown): LunchmateRoomConfigRecord | null {
  const record = typeof value === "string" ? parseJsonRecord(value) : isRecord(value) ? value : null;
  if (!record) return null;
  const wallpaperId = nullableIdentifier(record.wallpaperId);
  const floorId = nullableIdentifier(record.floorId);
  const furnitureId = nullableIdentifier(record.furnitureId);
  const propsId = nullableIdentifier(record.propsId);
  if (
    typeof wallpaperId !== "string"
    || typeof floorId !== "string"
    || furnitureId === undefined
    || propsId === undefined
  ) return null;
  return { wallpaperId, floorId, furnitureId, propsId };
}

export function normalizeLunchmatePatch(value: unknown): LunchmateProfilePatch | null {
  if (!isRecord(value)) return null;
  if (Object.keys(value).some((key) => !["character", "skin", "loadout", "roomConfig", "visibility"].includes(key))) {
    return null;
  }

  const patch: LunchmateProfilePatch = {};
  if ("character" in value) {
    const character = nullableIdentifier(value.character);
    if (character === undefined) return null;
    patch.character = character;
  }
  if ("skin" in value) {
    const skin = nullableIdentifier(value.skin);
    if (skin === undefined) return null;
    patch.skin = skin;
  }
  if ("loadout" in value) {
    if (value.loadout === null) patch.loadout = null;
    else {
      const loadout = normalizeLunchmateLoadout(value.loadout);
      if (!loadout) return null;
      patch.loadout = loadout;
    }
  }
  if ("roomConfig" in value) {
    if (value.roomConfig === null) patch.roomConfig = null;
    else {
      const roomConfig = normalizeLunchmateRoomConfig(value.roomConfig);
      if (!roomConfig) return null;
      patch.roomConfig = roomConfig;
    }
  }
  if ("visibility" in value) {
    if (value.visibility !== "public" && value.visibility !== "private") return null;
    patch.visibility = value.visibility;
  }
  return Object.keys(patch).length > 0 ? patch : null;
}

export function lunchmateProfileFromRow(row: LunchmateProfileRow): PublicLunchmateProfile {
  return {
    visibility: row.lunchmate_visibility === "private" ? "private" : "public",
    character: nullableIdentifier(row.foodie_char) ?? null,
    skin: nullableIdentifier(row.foodie_skin) ?? null,
    loadout: normalizeLunchmateLoadout(row.lunchmate_loadout),
    roomConfig: normalizeLunchmateRoomConfig(row.lunchmate_room_loadout),
  };
}

export function publicLunchmateProfileFromRow(row: LunchmateProfileRow): PublicLunchmateProfile {
  const profile = lunchmateProfileFromRow(row);
  return profile.visibility === "private"
    ? { visibility: "private", character: null, skin: null, loadout: null, roomConfig: null }
    : profile;
}

export function serializeLunchmateLoadout(value: LunchmateProfileLoadoutRecord | null): string | null {
  return value ? JSON.stringify(Object.fromEntries(LOADOUT_KEYS.map((key) => [key, value[key]]))) : null;
}

export function serializeLunchmateRoomConfig(value: LunchmateRoomConfigRecord | null): string | null {
  return value ? JSON.stringify(Object.fromEntries(ROOM_KEYS.map((key) => [key, value[key]]))) : null;
}
