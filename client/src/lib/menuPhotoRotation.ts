export type RotationLock = { current: boolean };

export function beginMenuPhotoRotation(
  lock: RotationLock,
  direction: -1 | 1,
  advance: (direction: -1 | 1) => void,
): boolean {
  if (lock.current) return false;
  lock.current = true;
  advance(direction);
  return true;
}

export function completeMenuPhotoRotation(lock: RotationLock): void {
  lock.current = false;
}
