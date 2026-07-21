import { useReducedMotion } from 'framer-motion';

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
  const reduceMotion = useReducedMotion();
  const motionEnabled = animated && !reduceMotion;

  return (
    <span
      role="img"
      aria-label="포크와 숟가락을 든 런치킨 캐릭터"
      className={`block shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      <span className={`block h-full w-full ${motionEnabled ? 'landing-lunchkin-float' : ''}`}>
        <span
          aria-hidden="true"
          className={`landing-lunchkin-frame block h-full w-full ${motionEnabled ? 'landing-lunchkin-frame--animated' : ''}`}
        />
      </span>
    </span>
  );
}
