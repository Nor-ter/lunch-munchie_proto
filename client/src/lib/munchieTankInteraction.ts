export const MUNCHIE_DRAG_THRESHOLD_PX = 9;

export interface PointLike {
  x: number;
  y: number;
}

export interface RectLike {
  left: number;
  right: number;
  top: number;
  bottom: number;
  width: number;
  height: number;
}

export function isMunchieDrag(
  deltaX: number,
  deltaY: number,
  threshold = MUNCHIE_DRAG_THRESHOLD_PX,
) {
  return Math.hypot(deltaX, deltaY) >= threshold;
}

export function isPointInsideRect(point: PointLike, rect: RectLike | null | undefined) {
  if (!rect) return false;
  return point.x >= rect.left
    && point.x <= rect.right
    && point.y >= rect.top
    && point.y <= rect.bottom;
}

export function expandInteractionRect(rect: RectLike, padding: number): RectLike {
  return {
    left: rect.left - padding,
    right: rect.right + padding,
    top: rect.top - padding,
    bottom: rect.bottom + padding,
    width: rect.width + padding * 2,
    height: rect.height + padding * 2,
  };
}
