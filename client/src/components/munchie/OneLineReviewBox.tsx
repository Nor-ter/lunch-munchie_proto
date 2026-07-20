import type { ReactNode } from 'react';

export default function OneLineReviewBox({
  children,
  compact = false,
  className = '',
}: {
  children: ReactNode;
  compact?: boolean;
  className?: string;
}) {
  return (
    <div
      data-ui="one-line-review"
      className={`relative flex items-center border border-[#F2B6AB] bg-[#FFF8F4] text-[#3B2A23] ${
        compact
          ? 'min-h-[34px] rounded-[11px] px-5 py-1.5'
          : 'min-h-[50px] rounded-[16px] px-8 py-2.5'
      } ${className}`}
    >
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute left-1 font-serif font-black leading-none text-[#EE857B] ${
          compact ? 'top-[-3px] text-[21px]' : 'top-[-7px] text-[30px]'
        }`}
      >
        “
      </span>
      <div className="min-w-0 flex-1">{children}</div>
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute right-1 font-serif font-black leading-none text-[#EE857B] ${
          compact ? 'bottom-[-6px] text-[21px]' : 'bottom-[-10px] text-[30px]'
        }`}
      >
        ”
      </span>
    </div>
  );
}
