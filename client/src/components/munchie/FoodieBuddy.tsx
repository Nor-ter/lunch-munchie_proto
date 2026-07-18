import { useEffect, useRef, type CSSProperties, type Ref } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { getSkinById, MUNCHIE_SKINS, type MunchieSkin } from '@/constants/skins';
import type { LunchmateProgressSnapshot } from '@/utils/lunchmateProgress';
import LunchmateCharacterRenderer from '@/components/munchie/LunchmateCharacterRenderer';
import type { LunchmateLoadout } from '@/types/lunchmateCustomization';

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
  size: number;
  /** 좌우 배회 반경(px) — 0이면 제자리 */
  wander: number;
  /** 바운스 주기(초) — 작을수록 활발 */
  bounce: number;
}

const LEVELS: FoodieLevel[] = [
  { min: 0, name: '알', size: 30, wander: 0, bounce: 2.2 },
  { min: 2, name: '새싹 푸디', size: 38, wander: 14, bounce: 1.6 },
  { min: 5, name: '먹보 푸디', size: 48, wander: 34, bounce: 1.1 },
  { min: 10, name: '전설의 미식가', size: 58, wander: 52, bounce: 0.8 },
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
const LUNCHMATE_RENDER_SIZE = 76;

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
}

/**
 * 캐릭터 이모지 위에 얹는 얼굴 — 픽사/토이스토리풍으로 눈에 흰자+반짝이는 하이라이트,
 * 표정 있는 눈썹, 이가 보이는 웃는 입을 그린다. 크기에 비례해 스케일된다.
 */
function FoodieFace({ size, sleepy }: { size: number; sleepy?: boolean }) {
  const eyeW = size * 0.2;
  const eyeH = size * 0.24;
  const eyeGap = size * 0.15;
  const eyeTop = size * 0.28;
  const pupilSize = eyeW * 0.56;
  const highlightSize = pupilSize * 0.4;
  const browW = eyeW * 1.05;
  const browH = Math.max(1.5, size * 0.032);
  const browTop = eyeTop - browH - size * 0.05;
  const noseSize = Math.max(2, size * 0.045);
  const noseTop = eyeTop + eyeH + size * 0.03;
  const mouthW = size * 0.28;
  const mouthH = mouthW * 0.62;
  const mouthTop = noseTop + noseSize + size * 0.03;
  const blushSize = size * 0.14;
  const blushGap = size * 0.35;

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {/* 눈썹 — 안쪽은 올리고 바깥쪽은 내려 호기심 많은 표정 */}
      {!sleepy && (
        <>
          <span
            style={{
              position: 'absolute', left: `calc(50% - ${eyeGap + eyeW / 2}px)`, top: browTop,
              width: browW, height: browH, borderRadius: 999, background: '#2B2320',
              transform: 'rotate(-14deg)',
            }}
          />
          <span
            style={{
              position: 'absolute', left: `calc(50% + ${eyeGap - eyeW / 2}px)`, top: browTop,
              width: browW, height: browH, borderRadius: 999, background: '#2B2320',
              transform: 'rotate(14deg)',
            }}
          />
        </>
      )}

      {/* 볼터치 */}
      <span
        style={{
          position: 'absolute', left: `calc(50% - ${blushGap + blushSize / 2}px)`, top: eyeTop + eyeH * 0.75,
          width: blushSize, height: blushSize * 0.65, borderRadius: '50%', background: 'rgba(255,130,130,0.5)',
        }}
      />
      <span
        style={{
          position: 'absolute', left: `calc(50% + ${blushGap - blushSize / 2}px)`, top: eyeTop + eyeH * 0.75,
          width: blushSize, height: blushSize * 0.65, borderRadius: '50%', background: 'rgba(255,130,130,0.5)',
        }}
      />

      {/* 눈 — 흰자 + 검은 눈동자 + 반짝이는 하이라이트 (토이스토리풍 글로시 눈), 알 단계는 감은 눈(^ ^) */}
      {sleepy ? (
        <>
          <span
            style={{
              position: 'absolute', left: `calc(50% - ${eyeGap + eyeW * 0.35}px)`, top: eyeTop + eyeH / 2,
              width: eyeW * 0.9, height: Math.max(1.5, size * 0.028), borderRadius: 999,
              background: '#2B2320', transform: 'rotate(-18deg)',
            }}
          />
          <span
            style={{
              position: 'absolute', left: `calc(50% + ${eyeGap - eyeW * 0.55}px)`, top: eyeTop + eyeH / 2,
              width: eyeW * 0.9, height: Math.max(1.5, size * 0.028), borderRadius: 999,
              background: '#2B2320', transform: 'rotate(18deg)',
            }}
          />
        </>
      ) : (
        <>
          {[-1, 1].map((side) => (
            <div
              key={side}
              style={{
                position: 'absolute',
                left: `calc(50% + ${side * eyeGap - eyeW / 2}px)`,
                top: eyeTop,
                width: eyeW,
                height: eyeH,
                borderRadius: '50%',
                background: '#FFFFFF',
                boxShadow: '0 0 0 1px rgba(0,0,0,0.06), inset 0 -1px 1px rgba(0,0,0,0.08)',
              }}
            >
              {/* 검은 눈동자 (살짝 안쪽으로 몰려 서로 마주보는 느낌) */}
              <span
                style={{
                  position: 'absolute',
                  left: side < 0 ? undefined : `${eyeW * 0.16}px`,
                  right: side < 0 ? `${eyeW * 0.16}px` : undefined,
                  top: '50%',
                  width: pupilSize,
                  height: pupilSize,
                  marginTop: -pupilSize / 2,
                  borderRadius: '50%',
                  background: '#2B2320',
                }}
              >
                {/* 반짝이는 하이라이트 */}
                <span
                  style={{
                    position: 'absolute', left: pupilSize * 0.18, top: pupilSize * 0.14,
                    width: highlightSize, height: highlightSize, borderRadius: '50%', background: '#FFFFFF',
                  }}
                />
                <span
                  style={{
                    position: 'absolute', right: pupilSize * 0.12, bottom: pupilSize * 0.1,
                    width: highlightSize * 0.45, height: highlightSize * 0.45, borderRadius: '50%',
                    background: 'rgba(255,255,255,0.85)',
                  }}
                />
              </span>
            </div>
          ))}
        </>
      )}

      {/* 코 */}
      <span
        style={{
          position: 'absolute', left: `calc(50% - ${noseSize / 2}px)`, top: noseTop,
          width: noseSize, height: noseSize, borderRadius: '50%', background: 'rgba(90,55,45,0.55)',
        }}
      />

      {/* 입 — 이가 보이는 활짝 웃는 입 */}
      {!sleepy && (
        <span
          style={{
            position: 'absolute', left: `calc(50% - ${mouthW / 2}px)`, top: mouthTop,
            width: mouthW, height: mouthH,
            background: '#B14A3E',
            borderBottomLeftRadius: '50%', borderBottomRightRadius: '50%',
            borderTopLeftRadius: mouthH, borderTopRightRadius: mouthH,
            overflow: 'hidden',
          }}
        >
          {/* 윗니 하이라이트 */}
          <span
            style={{
              position: 'absolute', left: mouthW * 0.16, top: 0,
              width: mouthW * 0.68, height: mouthH * 0.32,
              background: '#FFF8F2', borderBottomLeftRadius: 3, borderBottomRightRadius: 3,
            }}
          />
        </span>
      )}
    </div>
  );
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
}: FoodieBuddyProps) {
  const skin: MunchieSkin = getSkinById(skinId) ?? MUNCHIE_SKINS[0];
  const { level, index, next, progress } = foodieLevel(score);
  const isEgg = index === 0;
  const fallbackIsMax = index === LEVELS.length - 1;
  const face = isEgg ? '🥚' : (char ?? '🍙');
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
  const isReaction = effectiveUiState === 'reaction';
  const unseenCountLabel = normalizedUnseenCount > 9 ? '9+' : String(normalizedUnseenCount);
  const displayedLevel = progressSnapshot?.level ?? index + 1;
  const displayedLevelName = progressSnapshot?.levelName ?? level.name;
  const displayedIsMax = progressSnapshot?.isMaxLevel ?? fallbackIsMax;
  const displayedProgress = progressSnapshot
    ? Math.min(1, Math.max(0, progressSnapshot.progressPercent / 100))
    : progress;
  const previousDisplayedProgress = progressSnapshot
    && previousProgressSnapshot?.level === progressSnapshot.level
    ? Math.min(1, Math.max(0, previousProgressSnapshot.progressPercent / 100))
    : 0;
  const progressLabel = progressSnapshot
    ? progressSnapshot.isMaxLevel
      ? `${progressSnapshot.totalXp} 맛추억 · MAX`
      : `${progressSnapshot.totalXp} / ${progressSnapshot.nextLevelTotalXp} 맛추억`
    : next
      ? `다음 진화까지 ${next.min - score}점`
      : 'MAX 🎖️';
  const reactionProgressLabel = progressSnapshot
    ? `+${lastXpGain} XP · ${progressLabel}`
    : `맛추억 미리보기 +${lastXpGain} XP`;
  // idle 말풍선은 점수 기반으로 고정하고, mock flow 상태에서만 짧은 안내로 교체한다.
  const bubble = isReaction
    ? (resultMessage ?? '맛있는 한입 고마워! 😋')
    : isSharingAnimation
      ? '한입이 오고 있어! 🍴'
      : effectiveUiState === 'submitting'
        ? '한입 준비 중…'
        : effectiveUiState === 'error'
          ? '다시 한 번 해볼까?'
          : isFoodAvailable
            ? normalizedUnseenCount > 0
              ? `새 음식 ${unseenCountLabel}개 도착! 🍱`
              : '새 음식이 도착했어! 🍱'
            : BUBBLES[score % BUBBLES.length];
  const openFoodieRoom = onFoodieRoomOpen ?? onCustomize;
  const wanderRef = useRef<HTMLDivElement>(null);
  const bounceRef = useRef<HTMLDivElement>(null);
  const shadowRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const motionIsReduced = reducedMotion ?? false;

  // transform repeat가 첫 pose에 고정되는 Framer Motion 경로를 피한다.
  // 이 timeline은 Sheet 상태와 무관하게 계속 실행되고, 레벨 변경 또는 unmount 때만 정리된다.
  useEffect(() => {
    if (reducedMotion) return;

    const animations: Animation[] = [];

    if (wanderRef.current && level.wander > 0) {
      animations.push(wanderRef.current.animate(
        [
          { transform: `translateX(${-level.wander}px)` },
          { transform: `translateX(${level.wander}px)` },
        ],
        {
          duration: level.bounce * 1500,
          iterations: Infinity,
          direction: 'alternate',
          easing: 'ease-in-out',
        },
      ));
    }

    if (bounceRef.current) {
      animations.push(bounceRef.current.animate(
        [{ transform: 'translateY(0)' }, { transform: 'translateY(-7px)' }],
        {
          duration: level.bounce * 500,
          iterations: Infinity,
          direction: 'alternate',
          easing: 'ease-in-out',
        },
      ));
    }

    if (shadowRef.current) {
      animations.push(shadowRef.current.animate(
        [{ transform: 'scaleX(1)' }, { transform: 'scaleX(0.75)' }],
        {
          duration: level.bounce * 500,
          iterations: Infinity,
          direction: 'alternate',
          easing: 'ease-in-out',
        },
      ));
    }

    return () => animations.forEach(animation => animation.cancel());
  }, [level.bounce, level.wander, reducedMotion]);

  return (
    <div className="block w-full text-left">
      <div
        className="relative rounded-3xl overflow-hidden"
        style={{ height: 110, background: skin.frame, boxShadow: skin.frameShadow }}
      >
        {/* 기존 배너 전체 탭 동작을 유지하되, 런치박스는 별도 버튼으로 분리한다. */}
        <button
          type="button"
          onClick={openFoodieRoom}
          className="absolute inset-0 z-0 rounded-3xl bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset"
          style={{ '--tw-ring-color': skin.accent } as CSSProperties}
          aria-label="런치메이트룸 열기"
        />

        {/* 방 바닥 */}
        <div
          className="pointer-events-none absolute bottom-0 left-0 right-0"
          style={{ height: 26, background: 'rgba(255,255,255,0.55)', borderTop: `1.5px dashed ${skin.accent}55` }}
        />

        {/* 레벨 배지 + 진화 게이지 */}
        <button
          ref={progressButtonRef}
          type="button"
          onClick={onProgressOpen}
          tabIndex={onProgressOpen ? 0 : -1}
          aria-disabled={!onProgressOpen}
          aria-label="맛추억 미리보기 상세"
          className={`absolute top-2 left-2.5 z-20 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${
            onProgressOpen ? 'pointer-events-auto cursor-pointer' : 'pointer-events-none'
          }`}
        >
          <span
            className="rounded-full px-2 py-0.5 text-[9px] font-black"
            style={{ background: 'rgba(255,255,255,0.9)', color: skin.accent }}
          >
            Lv.{displayedLevel} {displayedLevelName}
          </span>
          <div className="relative mt-1 h-[5px] w-[86px] overflow-hidden rounded-full" style={{ background: 'rgba(255,255,255,0.65)' }}>
            <motion.div
              className="h-full rounded-full"
              style={{ background: skin.accent }}
              initial={{ width: 0 }}
              animate={{ width: `${displayedProgress * 100}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
            {isReaction && (
              <motion.div
                className="absolute inset-y-0 left-0 rounded-full bg-[#F5A623]"
                initial={{ width: `${previousDisplayedProgress * 100}%` }}
                animate={{ width: `${displayedProgress * 100}%` }}
                transition={{ duration: 0.55, ease: 'easeOut' }}
              />
            )}
          </div>
          <p className="mt-0.5 text-[8px] font-semibold" style={{ color: skin.accent }}>
            {isReaction ? reactionProgressLabel : progressLabel}
          </p>
        </button>

        {/* 커스텀 힌트 */}
        <span
          className="pointer-events-none absolute top-2 right-2.5 z-10 rounded-full px-2 py-0.5 text-[9px] font-bold"
          style={{ background: 'rgba(255,255,255,0.85)', color: skin.sub }}
        >
          🎨 런치메이트룸
        </span>

        {/* 런치박스 영역 — 새 음식 상태와 Sheet 진입점을 기존 배너 안에 겹쳐 표시한다. */}
        <motion.button
          ref={lunchboxButtonRef}
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onLunchboxOpen?.();
          }}
          disabled={!onLunchboxOpen}
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

        {/* 캐릭터 (좌우 배회 + 바운스) — Sheet open/close와 독립된 WAAPI timeline */}
        <div
          ref={wanderRef}
          className="pointer-events-none absolute left-1/2 z-10 will-change-transform"
          style={{ bottom: 2, marginLeft: -LUNCHMATE_RENDER_SIZE / 2 }}
        >
          <div ref={bounceRef} className="relative will-change-transform">
            {/* 말풍선 */}
            {(!isEgg || effectiveUiState !== 'idle') && (
              <motion.span
                className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-2 py-0.5 text-[8px] font-bold shadow-sm"
                style={{ top: -18, background: 'rgba(255,255,255,0.95)', color: skin.text }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ repeat: Infinity, repeatType: 'reverse', duration: 3, ease: 'easeInOut' }}
              >
                {bubble}
              </motion.span>
            )}
            {/* 새 음식 상태의 작은 시선 반응 — 기존 이동/바운스 위에만 겹쳐 레이아웃을 바꾸지 않는다. */}
            {isFoodAvailable && (
              <motion.span
                className="absolute -right-8 top-1 whitespace-nowrap text-[11px] drop-shadow-sm"
                initial={{ x: 0, rotate: -4 }}
                animate={{ x: 3, rotate: 4 }}
                transition={{ repeat: Infinity, repeatType: 'reverse', duration: 0.7, ease: 'easeInOut' }}
                aria-hidden="true"
              >
                👀→
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
              fallback={(
                <div style={{ position: 'relative', width: level.size, height: level.size }}>
                  <span style={{ fontSize: level.size, lineHeight: 1, display: 'block', filter: 'drop-shadow(0 3px 3px rgba(0,0,0,0.15))' }}>
                    {face}
                  </span>
                  <FoodieFace size={level.size} sleepy={isEgg} />
                </div>
              )}
            />
          </div>
          {/* 그림자 */}
          <div
            ref={shadowRef}
            className="mx-auto rounded-full will-change-transform"
            style={{ width: LUNCHMATE_RENDER_SIZE * 0.52, height: 5, background: 'rgba(0,0,0,0.14)', marginTop: 2 }}
          />
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
