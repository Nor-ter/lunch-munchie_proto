import { useEffect, useState, type ReactElement } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

/**
 * 먼치 코스맵 과일 캐릭터 — 키위/딸기/사과 3인방.
 * 코스의 각 음식점 위에 순서대로 앉아 말풍선으로 가게 이름을 알려준다.
 */
export type FruitKind = 'kiwi' | 'strawberry' | 'apple';

/** 코스 순서(1→2→3)에 대응하는 캐릭터 순서 — 키위 → 사과 → 딸기 */
export const FRUIT_SEQUENCE: FruitKind[] = ['kiwi', 'apple', 'strawberry'];

export function fruitForStop(index: number): FruitKind {
  return FRUIT_SEQUENCE[index % FRUIT_SEQUENCE.length]!;
}

/** 말풍선을 순차적으로 돌려 보여주기 위한 공용 인덱스 사이클 */
export function useSequentialIndex(count: number, intervalMs = 2400) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (count <= 1) return;
    const timer = window.setInterval(
      () => setIndex(current => (current + 1) % count),
      intervalMs,
    );
    return () => window.clearInterval(timer);
  }, [count, intervalMs]);
  return count > 0 ? index % count : 0;
}

function KiwiFace() {
  return (
    <svg viewBox="0 0 48 48" className="h-full w-full">
      <circle cx="24" cy="24" r="21" fill="#7A5A3C" />
      <circle cx="24" cy="24" r="18" fill="#9CCB6B" />
      <circle cx="24" cy="24" r="8.5" fill="#F0F6DF" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map(angle => (
        <circle
          key={angle}
          cx={24 + 13 * Math.cos((angle * Math.PI) / 180)}
          cy={24 + 13 * Math.sin((angle * Math.PI) / 180)}
          r="1.4"
          fill="#3E3120"
        />
      ))}
      <circle cx="19.5" cy="22.5" r="2" fill="#2E2318" />
      <circle cx="28.5" cy="22.5" r="2" fill="#2E2318" />
      <path d="M20.5 28 Q24 31 27.5 28" stroke="#2E2318" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      <circle cx="15.5" cy="27" r="2.2" fill="#F6A896" opacity="0.7" />
      <circle cx="32.5" cy="27" r="2.2" fill="#F6A896" opacity="0.7" />
    </svg>
  );
}

function StrawberryFace() {
  return (
    <svg viewBox="0 0 48 48" className="h-full w-full">
      <path
        d="M24 45 C11 38 7 28 8.5 20 C10 12 17 9 24 9 C31 9 38 12 39.5 20 C41 28 37 38 24 45 Z"
        fill="#FF5F70"
        stroke="#E23B50"
        strokeWidth="1.5"
      />
      <path d="M24 3 L26.5 9 L21.5 9 Z" fill="#4C9A46" />
      <path d="M24 9 C18 5.5 13.5 6.5 11.5 9.5 C16 11.5 20 11 24 9 Z" fill="#5FB257" />
      <path d="M24 9 C30 5.5 34.5 6.5 36.5 9.5 C32 11.5 28 11 24 9 Z" fill="#5FB257" />
      {[
        [15, 22], [33, 22], [13.5, 30], [34.5, 30], [20, 37], [28, 37],
      ].map(([x, y]) => (
        <ellipse key={`${x}-${y}`} cx={x} cy={y} rx="1.2" ry="1.7" fill="#FFE07A" />
      ))}
      <circle cx="19.5" cy="24.5" r="2" fill="#4A1520" />
      <circle cx="28.5" cy="24.5" r="2" fill="#4A1520" />
      <path d="M20.5 30 Q24 33 27.5 30" stroke="#4A1520" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      <circle cx="15" cy="28.5" r="2" fill="#FFB1A0" opacity="0.85" />
      <circle cx="33" cy="28.5" r="2" fill="#FFB1A0" opacity="0.85" />
    </svg>
  );
}

function AppleFace() {
  return (
    <svg viewBox="0 0 48 48" className="h-full w-full">
      <path
        d="M24 12 C16 6 6 10 6.5 21 C7 32 15 43 24 43 C33 43 41 32 41.5 21 C42 10 32 6 24 12 Z"
        fill="#EF4D52"
        stroke="#CB3038"
        strokeWidth="1.5"
      />
      <path d="M24 12 C23.5 7.5 25 4.5 27.5 3" stroke="#7A4A26" strokeWidth="2.4" strokeLinecap="round" fill="none" />
      <path d="M27.5 4.5 C31.5 2.5 34.5 3.5 35.5 6.5 C32 8 29 7.5 27.5 4.5 Z" fill="#5FB257" />
      <circle cx="19" cy="24" r="2" fill="#3D1013" />
      <circle cx="29" cy="24" r="2" fill="#3D1013" />
      <path d="M20 30 Q24 33.5 28 30" stroke="#3D1013" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      <circle cx="14" cy="28" r="2.2" fill="#FFA6A0" opacity="0.85" />
      <circle cx="34" cy="28" r="2.2" fill="#FFA6A0" opacity="0.85" />
      <path d="M15 15.5 Q18 13 21 14.5" stroke="#FFD9D6" strokeWidth="1.6" strokeLinecap="round" fill="none" opacity="0.8" />
    </svg>
  );
}

const FACES: Record<FruitKind, () => ReactElement> = {
  kiwi: KiwiFace,
  strawberry: StrawberryFace,
  apple: AppleFace,
};

export const FRUIT_LABELS: Record<FruitKind, string> = {
  kiwi: '키위',
  strawberry: '딸기',
  apple: '사과',
};

export default function FruitCharacter({
  kind,
  size = 40,
  className = '',
}: {
  kind: FruitKind;
  size?: number;
  className?: string;
}) {
  const Face = FACES[kind];
  return (
    <span
      className={`inline-block shrink-0 drop-shadow-[0_2px_4px_rgba(72,38,25,0.25)] ${className}`}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${FRUIT_LABELS[kind]} 캐릭터`}
    >
      <Face />
    </span>
  );
}

/**
 * 캐릭터 + 말풍선 — active일 때 말풍선(음식점 이름)이 떠오른다.
 * 말풍선은 캐릭터 상단에 붙는다.
 */
export function FruitCharacterWithBubble({
  kind,
  label,
  active,
  size = 40,
  className = '',
}: {
  kind: FruitKind;
  label: string;
  active: boolean;
  size?: number;
  className?: string;
}) {
  return (
    <span className={`relative inline-flex flex-col items-center ${className}`}>
      <AnimatePresence>
        {active && label && (
          <motion.span
            initial={{ opacity: 0, y: 6, scale: 0.85 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.9 }}
            transition={{ duration: 0.22 }}
            className="absolute bottom-full z-20 mb-1 max-w-[110px] truncate whitespace-nowrap rounded-lg border border-[#EAD9CE] bg-white px-2 py-1 text-[9px] font-black text-[#3B2A22] shadow-[0_4px_10px_rgba(60,35,22,0.16)]"
          >
            {label}
            <span className="absolute left-1/2 top-full -ml-1 border-4 border-transparent border-t-white" />
          </motion.span>
        )}
      </AnimatePresence>
      <motion.span
        animate={active ? { y: [0, -3, 0] } : { y: 0 }}
        transition={active ? { duration: 0.5 } : undefined}
      >
        <FruitCharacter kind={kind} size={size} />
      </motion.span>
    </span>
  );
}
