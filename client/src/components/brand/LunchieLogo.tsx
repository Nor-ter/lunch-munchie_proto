import { BRAND } from '@/constants/brand';

type LunchieLogoProps = {
  size?: number;
  showWordmark?: boolean;
  wordmarkClassName?: string;
  className?: string;
};

/** Canonical app logo — coral square + smiley mascot (single source across all screens) */
export function LunchieLogo({
  size = 40,
  showWordmark = false,
  wordmarkClassName = 'text-[22px]',
  className = '',
}: LunchieLogoProps) {
  const icon = (
    <div
      className="rounded-2xl flex items-center justify-center flex-shrink-0"
      style={{ width: size, height: size, background: BRAND.primary }}
      aria-hidden
    >
      <svg width={size * 0.62} height={size * 0.62} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="10" r="7" fill="white" opacity="0.97" />
        <circle cx="9.5" cy="9" r="1.2" fill={BRAND.primary} />
        <circle cx="14.5" cy="9" r="1.2" fill={BRAND.primary} />
        <path
          d="M9 12.5 Q12 15 15 12.5"
          stroke={BRAND.primary}
          strokeWidth="1.4"
          strokeLinecap="round"
          fill="none"
        />
        <rect x="9" y="18" width="6" height="2.5" rx="1.2" fill="white" opacity="0.92" />
        <rect x="10.5" y="16.5" width="3" height="2" rx="0.8" fill="white" opacity="0.92" />
      </svg>
    </div>
  );

  if (!showWordmark) {
    return <div className={className}>{icon}</div>;
  }

  return (
    <div className={`flex items-center justify-center gap-2 ${className}`}>
      {icon}
      <span
        className={wordmarkClassName}
        style={{ color: BRAND.primary, fontFamily: "'Baloo 2', cursive", fontWeight: 700 }}
      >
        Lunchie Munchie
      </span>
    </div>
  );
}
