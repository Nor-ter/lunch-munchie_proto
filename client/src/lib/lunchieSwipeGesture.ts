export type LunchieSwipeGestureAction = "like" | "dislike" | "neutral";

export function lunchieSwipeExit(action: LunchieSwipeGestureAction): { x: number; y: number } {
  if (action === "neutral") return { x: 0, y: 720 };
  return { x: action === "like" ? 520 : -520, y: 18 };
}

export function lunchieSwipeArc(
  action: LunchieSwipeGestureAction,
  start: { x: number; y: number },
): { x: number[]; y: number[]; scale: number[]; times: number[] } {
  const exit = lunchieSwipeExit(action);
  const direction = action === "like" ? 1 : action === "dislike" ? -1 : 1;
  const control = action === "neutral"
    ? { x: start.x + 88, y: start.y + 270 }
    : { x: start.x + direction * 220, y: Math.min(start.y - 148, -120) };
  const times = Array.from({ length: 9 }, (_, index) => index / 8);

  // One sampled Bézier keeps velocity continuous through the old preview/exit seam.
  const points = times.map((time) => {
    const progress = time * time * (3 - 2 * time);
    const inverse = 1 - progress;
    return {
      x: inverse * inverse * start.x + 2 * inverse * progress * control.x + progress * progress * exit.x,
      y: inverse * inverse * start.y + 2 * inverse * progress * control.y + progress * progress * exit.y,
      scale: 1 - progress * 0.03,
    };
  });

  return {
    x: points.map(point => Math.round(point.x * 100) / 100),
    y: points.map(point => Math.round(point.y * 100) / 100),
    scale: points.map(point => Math.round(point.scale * 1000) / 1000),
    times,
  };
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
