import type { CapturedMunchie, CapturedMunchiePlacement } from '@/types/munchieCapture';

interface TankLayer {
  bottomPercent: number;
  xPositions: readonly number[];
  sizePx: number;
}

export interface MunchieTankPresentation extends CapturedMunchiePlacement {
  depth: number;
  zIndex: number;
}

const TANK_LAYERS: readonly TankLayer[] = [
  { bottomPercent: 4, xPositions: [50, 29, 71, 12], sizePx: 102 },
  { bottomPercent: 18, xPositions: [40, 62, 19, 83], sizePx: 97 },
  { bottomPercent: 32, xPositions: [51, 29, 74, 12], sizePx: 92 },
  { bottomPercent: 46, xPositions: [39, 65, 18], sizePx: 87 },
  { bottomPercent: 60, xPositions: [52, 28, 77], sizePx: 82 },
  { bottomPercent: 73, xPositions: [40, 64, 18], sizePx: 77 },
];

const POSITIONS_PER_CYCLE = TANK_LAYERS.reduce(
  (total, layer) => total + layer.xPositions.length,
  0,
);

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function deterministicUnit(seed: string, salt: number) {
  let hash = 2166136261 ^ salt;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4_294_967_295;
}

function deterministicBetween(seed: string, salt: number, minimum: number, maximum: number) {
  return minimum + deterministicUnit(seed, salt) * (maximum - minimum);
}

function mix(start: number, end: number, amount: number) {
  return start + (end - start) * amount;
}

function slotForIndex(index: number) {
  const normalizedIndex = Math.max(0, Math.floor(index));
  const cycle = Math.floor(normalizedIndex / POSITIONS_PER_CYCLE);
  let slotIndex = normalizedIndex % POSITIONS_PER_CYCLE;

  for (let depth = 0; depth < TANK_LAYERS.length; depth += 1) {
    const layer = TANK_LAYERS[depth]!;
    if (slotIndex < layer.xPositions.length) {
      return {
        cycle,
        depth,
        layer,
        xPercent: layer.xPositions[slotIndex]!,
      };
    }
    slotIndex -= layer.xPositions.length;
  }

  return {
    cycle,
    depth: TANK_LAYERS.length - 1,
    layer: TANK_LAYERS[TANK_LAYERS.length - 1]!,
    xPercent: 50,
  };
}

export function createMunchieTankPlacement(
  munchieId: string,
  existingCount: number,
): CapturedMunchiePlacement {
  const slot = slotForIndex(existingCount);
  const cycleOffset = Math.min(slot.cycle, 3);
  const horizontalCycleOffset = slot.cycle % 2 === 0 ? cycleOffset * 1.5 : cycleOffset * -1.5;

  return {
    xPercent: clamp(
      slot.xPercent + horizontalCycleOffset + deterministicBetween(munchieId, 1, -2.4, 2.4),
      11,
      89,
    ),
    bottomPercent: clamp(
      slot.layer.bottomPercent + Math.min(slot.cycle * 1.5, 4.5)
        + deterministicBetween(munchieId, 2, -1.2, 1.2),
      3,
      78,
    ),
    sizePx: Math.round(clamp(
      slot.layer.sizePx - Math.min(slot.cycle * 3, 9) + deterministicBetween(munchieId, 3, -5, 5),
      68,
      108,
    )),
    rotationDeg: Math.round(deterministicBetween(munchieId, 4, -11, 11)),
  };
}

export function munchieTankSizeScale(itemCount: number) {
  if (itemCount <= 5) return 1;
  if (itemCount <= 12) return 0.86;
  if (itemCount <= 20) return 0.76;
  return 0.7;
}

export function getMunchieTankPresentation(
  munchie: CapturedMunchie,
  itemIndex: number,
  itemCount: number,
): MunchieTankPresentation {
  const preferredPlacement = createMunchieTankPlacement(munchie.id, itemIndex);
  const xPercent = clamp(mix(munchie.placement.xPercent, preferredPlacement.xPercent, 0.76), 10, 90);
  const bottomPercent = clamp(
    mix(munchie.placement.bottomPercent, preferredPlacement.bottomPercent, 0.82),
    3,
    78,
  );
  const depth = clamp(Math.floor(bottomPercent / 13), 0, TANK_LAYERS.length - 1);
  const sizePx = Math.round(clamp(
    munchie.placement.sizePx * munchieTankSizeScale(itemCount),
    56,
    108,
  ));

  return {
    xPercent,
    bottomPercent,
    sizePx,
    rotationDeg: clamp(munchie.placement.rotationDeg, -12, 12),
    depth,
    // Lower layers sit in front; recent items within a layer receive a small lift.
    zIndex: 80 - depth * 8 + Math.min(Math.max(0, itemIndex), 24),
  };
}
