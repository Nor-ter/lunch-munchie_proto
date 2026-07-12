import { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { getSkinById, MUNCHIE_SKINS, type MunchieSkin } from '@/constants/skins';

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
}: {
  /** 성장점수 = 나의 코스맵 수 + 나의 피드 수 */
  score: number;
  char?: string;
  skinId?: string;
  onCustomize: () => void;
}) {
  const skin: MunchieSkin = getSkinById(skinId) ?? MUNCHIE_SKINS[0];
  const { level, index, next, progress } = foodieLevel(score);
  const isEgg = index === 0;
  const isMax = index === LEVELS.length - 1;
  const face = isEgg ? '🥚' : (char ?? '🍙');
  // 말풍선은 점수 기반으로 고정 선택 (리렌더마다 안 바뀌게)
  const bubble = BUBBLES[score % BUBBLES.length];

  return (
    <button onClick={onCustomize} className="block w-full text-left" aria-label="푸디 캐릭터 커스텀">
      <div
        className="relative rounded-3xl overflow-hidden"
        style={{ height: 110, background: skin.frame, boxShadow: skin.frameShadow }}
      >
        {/* 방 바닥 */}
        <div
          className="absolute bottom-0 left-0 right-0"
          style={{ height: 26, background: 'rgba(255,255,255,0.55)', borderTop: `1.5px dashed ${skin.accent}55` }}
        />

        {/* 레벨 배지 + 진화 게이지 */}
        <div className="absolute top-2 left-2.5 z-10">
          <span
            className="rounded-full px-2 py-0.5 text-[9px] font-black"
            style={{ background: 'rgba(255,255,255,0.9)', color: skin.accent }}
          >
            Lv.{index + 1} {level.name}
          </span>
          <div className="mt-1 h-[5px] w-[86px] rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.65)' }}>
            <motion.div
              className="h-full rounded-full"
              style={{ background: skin.accent }}
              initial={{ width: 0 }}
              animate={{ width: `${progress * 100}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          </div>
          <p className="mt-0.5 text-[8px] font-semibold" style={{ color: skin.accent }}>
            {next ? `다음 진화까지 ${next.min - score}점` : 'MAX 🎖️'}
          </p>
        </div>

        {/* 커스텀 힌트 */}
        <span
          className="absolute top-2 right-2.5 z-10 rounded-full px-2 py-0.5 text-[9px] font-bold"
          style={{ background: 'rgba(255,255,255,0.85)', color: skin.sub }}
        >
          🎨 탭해서 꾸미기
        </span>

        {/* 캐릭터 (좌우 배회 + 바운스)
            주의: 이 프로젝트 환경에서 배열 키프레임([a,b,c]) + repeat:Infinity 조합은 첫 프레임에
            멈춰버리는 문제가 있어(WAAPI로 직접 구동해보면 정상 동작 확인됨), initial/animate 단일값 +
            repeatType:'reverse' 방식으로 우회한다. */}
        <motion.div
          key={`wander-${level.wander}`}
          className="absolute left-1/2 z-10"
          style={{ bottom: 16, marginLeft: -level.size / 2 }}
          initial={{ x: level.wander > 0 ? -level.wander : 0 }}
          animate={{ x: level.wander > 0 ? level.wander : 0 }}
          transition={
            level.wander > 0
              ? { repeat: Infinity, repeatType: 'reverse', duration: level.bounce * 1.5, ease: 'easeInOut' }
              : undefined
          }
        >
          <motion.div
            key={`bounce-${level.bounce}`}
            className="relative"
            initial={{ y: 0 }}
            animate={{ y: -7 }}
            transition={{ repeat: Infinity, repeatType: 'reverse', duration: level.bounce / 2, ease: 'easeInOut' }}
          >
            {/* 말풍선 */}
            {!isEgg && (
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
            {/* 왕관 (만렙) */}
            {isMax && (
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
            <div style={{ position: 'relative', width: level.size, height: level.size }}>
              <span style={{ fontSize: level.size, lineHeight: 1, display: 'block', filter: 'drop-shadow(0 3px 3px rgba(0,0,0,0.15))' }}>
                {face}
              </span>
              <FoodieFace size={level.size} sleepy={isEgg} />
            </div>
            {/* 알 단계: 안에서 캐릭터가 기다리는 힌트 */}
            {isEgg && (
              <span className="absolute -right-2 -bottom-1 text-[13px]">💤</span>
            )}
          </motion.div>
          {/* 그림자 */}
          <motion.div
            key={`shadow-${level.bounce}`}
            className="mx-auto rounded-full"
            style={{ width: level.size * 0.7, height: 5, background: 'rgba(0,0,0,0.14)', marginTop: 2 }}
            initial={{ scaleX: 1 }}
            animate={{ scaleX: 0.75 }}
            transition={{ repeat: Infinity, repeatType: 'reverse', duration: level.bounce / 2, ease: 'easeInOut' }}
          />
        </motion.div>

        {/* 만렙 반짝이 */}
        {isMax && (
          <>
            <motion.span
              className="absolute z-10"
              style={{ left: '22%', top: 24 }}
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1.1 }}
              transition={{ repeat: Infinity, repeatType: 'reverse', duration: 0.9, ease: 'easeInOut' }}
            >
              <Sparkles size={13} style={{ color: skin.accent }} />
            </motion.span>
            <motion.span
              className="absolute z-10"
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
    </button>
  );
}
