import type { LunchmateStateAssetKey } from './lunchmateAssets';

export type LunchmateFaceState =
  | 'default'
  | 'happy'
  | 'excited'
  | 'surprised'
  | 'sad'
  | 'thinking';

export type LunchmateEffectId =
  | 'surprised_marks'
  | 'thinking_bubble'
  | 'jump_lines';

export type LunchmateRenderSize = 'compact' | 'room';

export type LunchmateMotionState = 'idle' | 'success' | 'jump';

export interface LunchmateExpressionPresentation {
  faceState: LunchmateFaceState;
  effectId: LunchmateEffectId | null;
  motionState: LunchmateMotionState;
}

export function resolveLunchmateExpressionPresentation(
  requestedState: LunchmateStateAssetKey,
  renderSize: LunchmateRenderSize,
): LunchmateExpressionPresentation {
  if (requestedState === 'jump') {
    return {
      faceState: 'excited',
      effectId: renderSize === 'room' ? 'jump_lines' : null,
      motionState: 'jump',
    };
  }

  if (requestedState === 'eating') {
    return {
      faceState: 'happy',
      effectId: null,
      motionState: 'idle',
    };
  }

  if (requestedState === 'like') {
    return {
      faceState: 'happy',
      effectId: null,
      motionState: 'success',
    };
  }

  return {
    faceState: requestedState,
    effectId: requestedState === 'surprised'
      ? 'surprised_marks'
      : requestedState === 'thinking' && renderSize === 'room'
        ? 'thinking_bubble'
        : null,
    motionState: 'idle',
  };
}
