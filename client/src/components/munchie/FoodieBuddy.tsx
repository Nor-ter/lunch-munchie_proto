import { type Ref } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { getSkinById, MUNCHIE_SKINS, type MunchieSkin } from '@/constants/skins';
import type { LunchmateProgressSnapshot } from '@/utils/lunchmateProgress';
import LunchmateCharacterRenderer from '@/components/munchie/LunchmateCharacterRenderer';
import type { LunchmateLoadout } from '@/types/lunchmateCustomization';
import {
  resolveLunchmateProfilePresentationAsset,
  useLunchmateProfileMotion,
} from '@/hooks/useLunchmateProfileMotion';

/**
 * Foodie Buddy — 프로필 배너의 다마고치.
 * 코스맵·피드가 쌓일수록(성장점수) 캐릭터가 진화하고 모션이 활발해진다.
 * 캐릭터/방 스킨은 유저가 커스텀 (profile.foodieChar / foodieSkin).
 */

export const FOODIE_CHARS = [
  { emoji: '🍙', name: '주먹밥' },
  { emoji: '🍞', name: '식빵' },
  { emoji: '🥟', name: '만두' },
  { emoji: '🍩', name: '도넛' },
  { emoji: '🍜', name: '라멘' },
  { emoji: '🍓', name: '딸기' },
  { emoji: '🥑', name: '아보카도' },
  { emoji: '🍤', name: '새우튀김' },
] as const;

interface FoodieLevel {
  min: number;
  name: string;
}

const LEVELS: FoodieLevel[] = [
  { min: 0, name: '알' },
  { min: 2, name: '새싹 푸디' },
  { min: 5, name: '먹보 푸디' },
  { min: 10, name: '전설의 미식가' },
];

export function foodieLevel(score: number): { level: FoodieLevel; index: number; next: FoodieLevel | null; progress: number } {
  let index = 0;
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (score >= LEVELS[i].min) { index = i; break; }
  }
  const level = LEVELS[index];
  const next = LEVELS[index + 1] ?? null;
  const progress = next ? Math.min(1, (score - level.min) / (next.min - level.min)) : 1;
  return { level, index, next, progress };
}

const BUBBLES = ['냠냠 😋', '오늘 뭐 먹지?', '코스맵 더 줘!', '맛집 가고 싶다…', '먹부림 최고 🍴'];
const LUNCHMATE_RENDER_SIZE = 86;

function HangerIcon({ size = 17 }: { size?: number }) {
  return (
    <svg
      data-icon="hanger"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 9V7a2 2 0 1 0-2-2" />
      <path d="m12 9-8.2 6.7a1 1 0 0 0 .6 1.8h15.2a1 1 0 0 0 .6-1.8L12 9Z" />
    </svg>
  );
}

export type FoodieBuddyUiState =
  | 'idle'
  | 'foodAvailable'
  | 'selectingFood'
  | 'submitting'
  | 'sharingAnimation'
  | 'reaction'
  | 'error';

export interface FoodieBuddyProps {
  /** 기존 성장점수. Phase 1A의 새 음식 fixture와는 별개로 기존 레벨 표시에만 사용한다. */
  score: number;
  char?: string;
  skinId?: string;
  /** 기존 사용처 호환용 꾸미기 콜백 */
  onCustomize: () => void;
  /** 표시 전용 UI 상태. 생략하면 기존과 같은 idle 상태다. */
  uiState?: FoodieBuddyUiState;
  /** 아직 확인하지 않은 음식 수. localStorage/AppContext에 저장하지 않는다. */
  unseenFoodCount?: number;
  /** 런치박스 진입 동작. 생략하면 버튼은 표시만 하고 비활성화한다. */
  onLunchboxOpen?: () => void;
  /** Sheet가 닫힌 뒤 런치박스 버튼으로 포커스를 복귀시키기 위한 ref */
  lunchboxButtonRef?: Ref<HTMLButtonElement>;
  /** 실제 성장점수와 분리된 맛추억 preview 상세 열기 */
  onProgressOpen?: () => void;
  /** 맛추억 상세 Sheet가 닫힌 뒤 포커스를 복귀시키기 위한 ref */
  progressButtonRef?: Ref<HTMLButtonElement>;
  /** 성공한 mock 음식의 전달 표현용 placeholder */
  sharedFoodPlaceholder?: string;
  /** 전달되면 배너 Level/XP/Progress/MAX 표시에 사용하는 단일 preview 원본 */
  progressSnapshot?: LunchmateProgressSnapshot;
  /** 한입 결과에서 같은 Level Definition 기반 progress 전환을 표현한다. */
  previousProgressSnapshot?: LunchmateProgressSnapshot;
  lastXpGain?: number;
  resultMessage?: string;
  /** 기존 Level Up overlay 상태를 jump 이미지로 표현하기 위한 시각 전용 override */
  levelUpActive?: boolean;
  /** lm_profile에 적용된 네 slot 코스튬 조합 */
  loadout?: LunchmateLoadout;
  /** 런치메이트룸 진입 동작. 생략하면 기존 onCustomize로 폴백한다. */
  onFoodieRoomOpen?: () => void;
  /** Pointer feeding의 캐릭터 drop target bounds를 공유한다. */
  foodDropTargetRef?: Ref<HTMLDivElement>;
  isLunchboxOpen?: boolean;
  isFoodDragging?: boolean;
  isFoodDragOver?: boolean;
}

export default function FoodieBuddy({
  score,
  char,
  skinId,
  onCustomize,
  uiState = 'idle',
  unseenFoodCount = 0,
  onLunchboxOpen,
  lunchboxButtonRef,
  onProgressOpen,
  progressButtonRef,
  sharedFoodPlaceholder,
  progressSnapshot,
  previousProgressSnapshot,
  lastXpGain = 0,
  resultMessage,
  levelUpActive = false,
  loadout,
  onFoodieRoomOpen,
  foodDropTargetRef,
  isLunchboxOpen = false,
  isFoodDragging = false,
  isFoodDragOver = false,
}: FoodieBuddyProps) {
  const skin: MunchieSkin = getSkinById(skinId) ?? MUNCHIE_SKINS[0];
  const { level, index, next, progress } = foodieLevel(score);
  const isEgg = index === 0;
  const fallbackIsMax = index === LEVELS.length - 1;
  const normalizedUnseenCount = Number.isFinite(unseenFoodCount)
    ? Math.max(0, Math.floor(unseenFoodCount))
    : 0;
  // 성공 연출이 idle로 끝난 뒤에도 unseen fixture가 남아 있으면 새 음식 기본 상태로 복귀한다.
  const effectiveUiState: FoodieBuddyUiState = uiState === 'idle' && normalizedUnseenCount > 0
    ? 'foodAvailable'
    : uiState;
  const isFoodAvailable = effectiveUiState === 'foodAvailable'
    || effectiveUiState === 'selectingFood'
    || effectiveUiState === 'submitting'
    || effectiveUiState === 'error';
  const isSharingAnimation = effectiveUiState === 'sharingAnimation';
  const isFeeding = effectiveUiState === 'submitting' || isSharingAnimation;
  const isReaction = effectiveUiState === 'reaction';
  const unseenCountLabel = normalizedUnseenCount > 9 ? '9+' : String(normalizedUnseenCount);
  const displayedIsMax = progressSnapshot?.isMaxLevel ?? fallbackIsMax;
  const displayedProgress = progressSnapshot
    ? Math.min(1, Math.max(0, progressSnapshot.progressPercent / 100))
    : progress;
  const isCompletingKimbapLine = Boolean(
    isReaction
    && progressSnapshot
    && previousProgressSnapshot
    && progressSnapshot.level > previousProgressSnapshot.level,
  );
  const kimbapSnapshot = isCompletingKimbapLine ? previousProgressSnapshot : progressSnapshot;
  const kimbapStackSize = 5;
  const kimbapProgress = kimbapSnapshot?.isMaxLevel
    ? 1
    : Math.min(1, Math.max(0, (kimbapSnapshot?.progressPercent ?? displayedProgress * 100) / 100));
  const kimbapCountForProgress = (value: number) => {
    if (value >= 1) return kimbapStackSize;
    if (value <= 0) return 0;
    return Math.min(kimbapStackSize - 1, Math.ceil(value * (kimbapStackSize - 1)));
  };
  const filledKimbapCount = isCompletingKimbapLine
    ? kimbapStackSize
    : levelUpActive
      ? 0
    : kimbapCountForProgress(kimbapProgress);
  const previousKimbapProgress = previousProgressSnapshot?.isMaxLevel
    ? 1
    : Math.min(1, Math.max(0, (previousProgressSnapshot?.progressPercent ?? 0) / 100));
  const previousFilledKimbapCount = isCompletingKimbapLine
    ? kimbapCountForProgress(previousKimbapProgress)
    : progressSnapshot && previousProgressSnapshot?.level === progressSnapshot.level
      ? kimbapCountForProgress(previousKimbapProgress)
      : 0;
  const progressLabel = progressSnapshot
    ? progressSnapshot.isMaxLevel
      ? `${progressSnapshot.totalXp} 맛추억 · MAX`
      : `${progressSnapshot.totalXp} / ${progressSnapshot.nextLevelTotalXp} 맛추억`
    : next
      ? `다음 진화까지 ${next.min - score}점`
      : 'MAX 🎖️';
  // idle 말풍선은 점수 기반으로 고정하고, mock flow 상태에서만 짧은 안내로 교체한다.
  const bubble = isFoodDragOver
    ? '여기에 놓아주세요!'
    : isFoodDragging
      ? '런치메이트에게 가져다주세요'
      : isFeeding
        ? '맛있게 먹는 중…'
        : isReaction
          ? (resultMessage ?? '맛있는 한입 고마워! 😋')
          : effectiveUiState === 'error'
            ? '다시 한 번 해볼까?'
            : isFoodAvailable
              ? normalizedUnseenCount > 0
                ? `새 음식 ${unseenCountLabel}개 도착! 🍱`
                : '새 음식이 도착했어! 🍱'
              : BUBBLES[score % BUBBLES.length];
  const openFoodieRoom = onFoodieRoomOpen ?? onCustomize;
  const reducedMotion = useReducedMotion();
  const motionIsReduced = reducedMotion ?? false;
  const profileMotion = useLunchmateProfileMotion({
    suspended: isFeeding || isFoodDragging || isLunchboxOpen,
  });
  const automaticProfileChickenAsset = resolveLunchmateProfilePresentationAsset(
    profileMotion.assetKey,
    isFeeding,
    profileMotion.interactionReady,
  );
  const profileChickenAsset = isFeeding
    ? automaticProfileChickenAsset
    : profileMotion.grab.assetKeyOverride ?? automaticProfileChickenAsset;
  const profileAutomaticX = profileMotion.grab.hasVisualControl
    ? 0
    : profileMotion.x;

  return (
    <div className="block w-full text-left">
      <div
        ref={profileMotion.stageRef}
        className="relative rounded-3xl overflow-hidden"
        style={{ height: 'clamp(144px, 38vw, 150px)', background: skin.frame, boxShadow: skin.frameShadow }}
      >
        {/* 방 바닥 */}
        <div
          className="pointer-events-none absolute bottom-0 left-0 right-0"
          style={{ height: 30, background: 'rgba(255,255,255,0.55)', borderTop: `1.5px dashed ${skin.accent}55` }}
        />

        {/* EXP 수치 + 왼쪽 세로 김밥 스택 */}
        <motion.button
          ref={progressButtonRef}
          type="button"
          onClick={onProgressOpen}
          tabIndex={onProgressOpen ? 0 : -1}
          aria-disabled={!onProgressOpen}
          aria-label="맛추억 미리보기 상세"
          className={`absolute bottom-2.5 left-2.5 top-2.5 z-20 flex w-[38px] flex-col items-center rounded-[17px] border border-white/80 bg-white/75 px-1 py-1.5 shadow-sm backdrop-blur-[2px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${
            onProgressOpen ? 'pointer-events-auto cursor-pointer' : 'pointer-events-none'
          }`}
          animate={isCompletingKimbapLine || levelUpActive
            ? motionIsReduced
              ? { x: 0, rotate: 0 }
              : { x: [0, -2, 2, -2, 2, 0], rotate: [0, -1.2, 1.2, -1, 1, 0] }
            : { x: 0, rotate: 0 }}
          transition={{ duration: motionIsReduced ? 0 : 0.42, ease: 'easeInOut' }}
        >
          <span className="text-[8px] font-black tracking-[0.08em]" style={{ color: skin.accent }}>
            EXP
          </span>
          <span className="mt-0.5 text-[7px] font-black leading-none text-[#49372E]">
            {progressSnapshot?.isMaxLevel ? 'MAX' : `${progressSnapshot?.xpIntoCurrentLevel ?? 0}/${progressSnapshot?.xpRequiredForNextLevel ?? 0}`}
          </span>

          <div
            role="progressbar"
            aria-label={`김밥 EXP ${progressLabel}`}
            aria-valuemin={0}
            aria-valuemax={kimbapSnapshot?.isMaxLevel ? 1 : kimbapSnapshot?.xpRequiredForNextLevel ?? 100}
            aria-valuenow={kimbapSnapshot?.isMaxLevel ? 1 : kimbapSnapshot?.xpIntoCurrentLevel ?? 0}
            className="relative mt-1 min-h-0 w-[30px] flex-1"
          >
            <span aria-hidden="true" className="absolute bottom-0 left-1/2 h-[5px] w-[26px] -translate-x-1/2 rounded-full bg-[#49372E]/15" />

            {Array.from({ length: filledKimbapCount }, (_, index) => {
              const newlyFilled = index >= previousFilledKimbapCount;
              return (
                <motion.span
                  key={`${kimbapSnapshot?.level ?? 0}-${index}`}
                  aria-hidden="true"
                  className="absolute left-1/2 block h-[20px] w-[28px] -translate-x-1/2 drop-shadow-[0_2px_1px_rgba(52,38,28,0.18)]"
                  style={{ bottom: 3 + index * 15, zIndex: index + 1 }}
                  initial={newlyFilled && !motionIsReduced ? { y: -18, scale: 0.6, opacity: 0 } : false}
                  animate={{ y: 0, scale: 1, opacity: 1 }}
                  transition={{
                    delay: newlyFilled ? Math.min(0.3, (index - previousFilledKimbapCount) * 0.08) : 0,
                    type: 'spring',
                    stiffness: 380,
                    damping: 16,
                  }}
                >
                  <span className="absolute bottom-0 left-[1px] right-[1px] h-[14px] rounded-b-[8px] bg-[#171715]" />
                  <span className="absolute left-0 top-0 h-[11px] w-full rounded-[50%] border-[2px] border-[#171715] bg-[#FFFDF1]">
                    <span className="absolute left-[5px] top-[2px] h-[4px] w-[6px] rounded-full bg-[#79AF45]" />
                    <span className="absolute left-[10px] top-[1px] h-[5px] w-[6px] rounded-full bg-[#F4C443]" />
                    <span className="absolute right-[5px] top-[2px] h-[4px] w-[6px] rounded-full bg-[#B17842]" />
                    <span className="absolute bottom-[1px] left-[7px] h-[4px] w-[6px] rounded-full bg-[#E66A47]" />
                    <span className="absolute bottom-[1px] right-[7px] h-[4px] w-[6px] rounded-full bg-[#9C532E]" />
                  </span>
                </motion.span>
              );
            })}

            {(isCompletingKimbapLine || levelUpActive) && (
              <motion.div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 rounded-[14px] border-2 border-[#FFD34E]"
                initial={{ opacity: 0, scale: 0.92 }}
                animate={motionIsReduced ? { opacity: [0, 1, 0] } : { opacity: [0, 1, 0.35, 1, 0], scale: [0.92, 1.08, 1, 1.04, 1.1] }}
                transition={{ duration: motionIsReduced ? 0.35 : 0.8, ease: 'easeOut' }}
              />
            )}
          </div>

          {isReaction && lastXpGain > 0 && !isCompletingKimbapLine && (
            <motion.span
              className="absolute -right-5 top-8 rounded-full bg-[#E85053] px-1.5 py-0.5 text-[8px] font-black text-white shadow-sm"
              initial={{ opacity: 0, y: 6, scale: 0.7 }}
              animate={{ opacity: [0, 1, 1, 0], y: [6, 0, -3, -9], scale: [0.7, 1.08, 1, 0.9] }}
              transition={{ duration: 1.05, ease: 'easeOut' }}
            >
              +{lastXpGain}
            </motion.span>
          )}

          {(isCompletingKimbapLine || levelUpActive) && (
            <motion.span
              aria-hidden="true"
              className="pointer-events-none absolute -right-3 top-4 text-[#FFD34E] drop-shadow-sm"
              initial={{ opacity: 0, rotate: -30, scale: 0.4 }}
              animate={{ opacity: [0, 1, 0.4, 1, 0], rotate: [-30, 10, -8, 16, 28], scale: [0.4, 1.25, 0.85, 1.1, 0.6] }}
              transition={{ duration: 0.85, ease: 'easeOut' }}
            >
              <Sparkles size={16} fill="currentColor" />
            </motion.span>
          )}
        </motion.button>

        {/* 배너 전체가 아닌 이 명시적인 버튼만 Room으로 이동한다. */}
        <button
          type="button"
          onClick={openFoodieRoom}
          disabled={profileMotion.grab.isActive}
          className="absolute right-2.5 top-2.5 z-20 flex h-8 w-8 items-center justify-center rounded-full shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:cursor-default"
          style={{ background: 'rgba(255,255,255,0.85)', color: skin.sub }}
          aria-label="런치메이트 룸 열기"
        >
          <HangerIcon />
        </button>

        {/* 런치박스 영역 — 새 음식 상태와 Sheet 진입점을 기존 배너 안에 겹쳐 표시한다. */}
        <motion.button
          ref={lunchboxButtonRef}
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            if (profileMotion.grab.isActive) return;
            onLunchboxOpen?.();
          }}
          disabled={!onLunchboxOpen || profileMotion.grab.isActive}
          className="absolute bottom-2 right-3 z-30 flex h-10 w-12 items-center justify-center rounded-2xl border border-white/70 bg-white/90 text-[23px] shadow-sm disabled:cursor-default"
          initial={{ y: 0 }}
          animate={{ y: isFoodAvailable ? -2 : 0 }}
          transition={isFoodAvailable
            ? { repeat: Infinity, repeatType: 'reverse', duration: 1.15, ease: 'easeInOut' }
            : { duration: 0.2 }}
          aria-label={isFoodAvailable && normalizedUnseenCount > 0
            ? `새 음식 ${normalizedUnseenCount}개가 있는 런치박스`
            : '런치박스'}
        >
          <span aria-hidden="true">🍱</span>
          {isFoodAvailable && normalizedUnseenCount > 0 && (
            <motion.span
              className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-[#EB5053] px-1 text-[9px] font-black leading-none text-white shadow-sm"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1.05 }}
              transition={{ repeat: Infinity, repeatType: 'reverse', duration: 0.75, ease: 'easeInOut' }}
            >
              {unseenCountLabel}
            </motion.span>
          )}
        </motion.button>

        {isSharingAnimation && sharedFoodPlaceholder && (
          <motion.span
            className="pointer-events-none absolute bottom-10 z-30 text-[24px] drop-shadow-md"
            style={{ marginLeft: -12 }}
            initial={motionIsReduced
              ? { left: '52%', y: -6, scale: 0.9, opacity: 0 }
              : { left: '88%', y: 0, scale: 0.75, opacity: 0 }}
            animate={motionIsReduced
              ? {
                  left: '52%',
                  y: -6,
                  scale: [0.9, 1, 1],
                  opacity: [0, 1, 1],
                }
              : {
                  left: ['88%', '72%', '52%'],
                  y: [0, -12, -6],
                  scale: [0.75, 1.05, 1],
                  opacity: [0, 1, 1],
                }}
            transition={{
              duration: motionIsReduced ? 0.3 : 0.38,
              ease: 'easeInOut',
              times: motionIsReduced ? [0, 0.55, 1] : [0, 0.48, 1],
            }}
            data-lunchmate-food-flight="true"
            aria-hidden="true"
          >
            {sharedFoodPlaceholder}
          </motion.span>
        )}

        {/* Profile 전용 작은 순찰. drop target 자체는 중앙에 고정해 pointer 판정을 보존한다. */}
        <div
          ref={foodDropTargetRef}
          role="region"
          aria-label={isFoodDragOver
            ? '런치메이트 음식 놓기 영역, 지금 놓을 수 있어요'
            : '런치메이트 음식 놓기 영역'}
          data-lunchmate-drop-active={isFoodDragging ? 'true' : 'false'}
          data-lunchmate-drop-over={isFoodDragOver ? 'true' : 'false'}
          data-lunchmate-profile-grab-anchor="true"
          className="pointer-events-none absolute left-1/2 z-10 flex w-[116px] flex-col items-center rounded-[28px] transition-[background-color,box-shadow]"
          style={{
            bottom: 3,
            marginLeft: -58,
            background: isFoodDragging ? 'rgba(255,255,255,0.2)' : 'transparent',
            boxShadow: isFoodDragOver
              ? `0 0 0 3px rgba(255,255,255,0.95), 0 0 0 6px ${skin.accent}`
              : isFoodDragging
                ? '0 0 0 2px rgba(255,255,255,0.75)'
                : 'none',
          }}
        >
          <div
            ref={profileMotion.characterRef}
            className={`pointer-events-auto w-[86px] will-change-transform ${
              profileMotion.grab.phase === 'grabbed' ? 'cursor-grabbing' : 'cursor-grab'
            }`}
            style={{
              transform: `translate3d(${profileAutomaticX}px, 0, 0)`,
              transformOrigin: 'center bottom',
              transitionDuration: `${profileMotion.grab.hasVisualControl
                ? 0
                : profileMotion.positionTransitionMs}ms`,
              transitionProperty: 'transform',
              transitionTimingFunction: 'linear',
              willChange: profileMotion.reducedMotion ? 'auto' : 'transform',
              touchAction: 'none',
              userSelect: 'none',
              WebkitUserSelect: 'none',
            }}
            data-lunchmate-profile-motion={profileMotion.activity}
            data-lunchmate-profile-frame={profileMotion.frame}
            data-lunchmate-profile-ready={profileMotion.motionReady ? 'true' : 'false'}
            data-lunchmate-profile-grab={profileMotion.grab.phase}
            role="img"
            aria-label="런치메이트 캐릭터"
            onPointerDown={(event) => {
              const started = profileMotion.grab.handlePointerDown({
                pointerId: event.pointerId,
                isPrimary: event.isPrimary,
                clientX: event.clientX,
                clientY: event.clientY,
                target: event.currentTarget,
              });
              if (started) event.preventDefault();
            }}
            onPointerMove={(event) => {
              const moved = profileMotion.grab.handlePointerMove(
                event.pointerId,
                event.clientX,
                event.clientY,
              );
              if (moved) event.preventDefault();
            }}
            onPointerUp={(event) => {
              if (profileMotion.grab.handlePointerUp(event.pointerId)) {
                event.preventDefault();
              }
            }}
            onPointerCancel={(event) => {
              profileMotion.grab.handlePointerCancel(event.pointerId);
            }}
            onLostPointerCapture={(event) => {
              profileMotion.grab.handleLostPointerCapture(event.pointerId);
            }}
            onClick={(event) => {
              if (profileMotion.grab.consumeClickSuppression()) {
                event.preventDefault();
                event.stopPropagation();
              }
            }}
            onContextMenu={(event) => event.preventDefault()}
            onDragStart={(event) => event.preventDefault()}
          >
            <motion.div
              style={{
                x: profileMotion.grab.positionX,
                y: profileMotion.grab.positionY,
              }}
              data-lunchmate-profile-grab-position="true"
            >
              <motion.div
                style={{
                  rotate: profileMotion.grab.pendulumRotate,
                  transformOrigin: '50% 7%',
                }}
                data-lunchmate-profile-pendulum="true"
              >
                <div
                  style={{
                    transform: `scaleX(${profileMotion.grab.scaleX}) scaleY(${profileMotion.grab.scaleY})`,
                    transformOrigin: 'center bottom',
                    transitionDuration: `${profileMotion.grab.transitionMs}ms`,
                    transitionProperty: 'transform',
                    transitionTimingFunction: 'ease-in-out',
                  }}
                  data-lunchmate-profile-grab-pose="true"
                >
                  <div
                    style={{
                      transform: `scaleY(${profileMotion.scaleY})`,
                      transformOrigin: 'center bottom',
                      transitionDuration: `${profileMotion.poseTransitionMs}ms`,
                      transitionProperty: 'transform',
                      transitionTimingFunction: 'ease-in-out',
                    }}
                  >
                    <motion.div
                      style={{ transformOrigin: 'center bottom' }}
                      animate={profileMotion.emotionMotion.animate}
                      transition={profileMotion.emotionMotion.transition}
                      data-lunchmate-profile-emotion={profileMotion.emotionMotion.id}
                    >
                      <div className="relative">
                        {/* 말풍선 */}
                        {(!isEgg || effectiveUiState !== 'idle') && (
                          <motion.span
                            className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-white bg-white/95 px-2.5 py-1 text-[9px] font-black text-[#49372E] shadow-md"
                            style={{ top: -20 }}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ repeat: Infinity, repeatType: 'reverse', duration: 3, ease: 'easeInOut' }}
                          >
                            {bubble}
                          </motion.span>
                        )}
                        {/* 왕관 (만렙) */}
                        {displayedIsMax && (
                          <motion.span
                            className="absolute left-1/2 -translate-x-1/2"
                            style={{ top: -14, fontSize: 16 }}
                            initial={{ rotate: -8 }}
                            animate={{ rotate: 8 }}
                            transition={{ repeat: Infinity, repeatType: 'reverse', duration: 0.8, ease: 'easeInOut' }}
                          >
                            👑
                          </motion.span>
                        )}
                        <LunchmateCharacterRenderer
                          flowState={effectiveUiState}
                          levelUpActive={levelUpActive}
                          loadout={loadout}
                          size={LUNCHMATE_RENDER_SIZE}
                          renderSize="compact"
                          artwork="chicken"
                          chickenAssetKeyOverride={profileChickenAsset}
                          onChickenImageLoad={profileMotion.handleCharacterImageLoad}
                          animated={false}
                          fallback={(
                            <span className="text-[60px] leading-none" role="img" aria-label="런치메이트 대체 표시">
                              {char ?? '🐥'}
                            </span>
                          )}
                        />
                      </div>
                    </motion.div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
            {/* 그림자 */}
            <div
              className="mx-auto rounded-full"
              style={{ width: LUNCHMATE_RENDER_SIZE * 0.52, height: 5, background: 'rgba(0,0,0,0.14)', marginTop: -1 }}
            />
          </div>
        </div>

        {/* 만렙 반짝이 */}
        {displayedIsMax && (
          <>
            <motion.span
              className="pointer-events-none absolute z-10"
              style={{ left: '22%', top: 24 }}
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1.1 }}
              transition={{ repeat: Infinity, repeatType: 'reverse', duration: 0.9, ease: 'easeInOut' }}
            >
              <Sparkles size={13} style={{ color: skin.accent }} />
            </motion.span>
            <motion.span
              className="pointer-events-none absolute z-10"
              style={{ right: '20%', top: 40 }}
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1.2 }}
              transition={{ repeat: Infinity, repeatType: 'reverse', duration: 1.15, delay: 0.35, ease: 'easeInOut' }}
            >
              <Sparkles size={11} style={{ color: skin.accent }} />
            </motion.span>
          </>
        )}
      </div>
    </div>
  );
}
