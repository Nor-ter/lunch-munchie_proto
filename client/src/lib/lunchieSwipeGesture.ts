export type LunchieSwipeGestureAction = "like" | "dislike" | "neutral";

export function lunchieSwipeExit(action: LunchieSwipeGestureAction): { x: number; y: number } {
  if (action === "neutral") return { x: 0, y: 720 };
  return { x: action === "like" ? 520 : -520, y: 18 };
}

export function lunchieButtonSwipePreview(action: LunchieSwipeGestureAction): { x: number; y: number; scale: number } {
  if (action === "neutral") return { x: 0, y: 42, scale: 0.985 };
  return { x: action === "like" ? 42 : -42, y: 4, scale: 0.985 };
}

type SwipeGestureInput = {
  offsetX: number;
  offsetY: number;
  velocityX?: number;
  velocityY?: number;
  distanceThreshold?: number;
  velocityProjection?: number;
};

/**
 * Maps a deliberate card gesture to the same three actions as the buttons.
 * Upward and short gestures intentionally return null to avoid accidental votes.
 */
export function resolveLunchieSwipeGesture({
  offsetX,
  offsetY,
  velocityX = 0,
  velocityY = 0,
  distanceThreshold = 88,
  velocityProjection = 0.08,
}: SwipeGestureInput): LunchieSwipeGestureAction | null {
  const projectedX = offsetX + velocityX * velocityProjection;
  const projectedY = offsetY + velocityY * velocityProjection;
  const horizontalDistance = Math.abs(projectedX);

  if (
    projectedY >= distanceThreshold &&
    projectedY >= horizontalDistance * 0.82
  ) {
    return "neutral";
  }

  if (
    horizontalDistance >= distanceThreshold &&
    horizontalDistance >= Math.abs(projectedY)
  ) {
    return projectedX > 0 ? "like" : "dislike";
  }

  return null;
}
