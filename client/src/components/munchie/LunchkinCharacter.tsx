import { motion } from 'framer-motion';

/** 첨부 레퍼런스를 바탕으로 만든 런치킨 비트맵 마스코트. */
export default function LunchkinCharacter({
  size = 96,
  animated = true,
  className = '',
}: {
  size?: number;
  animated?: boolean;
  className?: string;
}) {
  return (
    <motion.img
      src="/assets/characters/lunchkin.png"
      alt="포크와 숟가락을 든 런치킨 캐릭터"
      className={`block shrink-0 object-contain ${className}`}
      style={{ width: size, height: size }}
      animate={animated ? { y: [0, -4, 0], rotate: [0, -1.5, 0, 1.5, 0] } : undefined}
      transition={animated ? { duration: 2.2, repeat: Infinity, ease: 'easeInOut' } : undefined}
      draggable={false}
    />
  );
}
