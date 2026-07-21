import type { ReactNode } from 'react';

export default function OneLineReviewBox({
  children,
  compact = false,
  slim = false,
  className = '',
}: {
  children: ReactNode;
  compact?: boolean;
  slim?: boolean;
  className?: string;
}) {
  return (
    <div
      data-ui="one-line-review"
      className={`relative flex items-center border border-[#F2B6AB] bg-[#FFF8F4] text-[#3B2A23] ${
        slim
          ? 'min-h-[26px] rounded-[10px] px-5 py-0.5'
          : compact
          ? 'min-h-[34px] rounded-[11px] px-5 py-1.5'
          : 'min-h-[50px] rounded-[16px] px-8 py-2.5'
      } ${className}`}
    >
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute left-1 font-serif font-black leading-none text-[#EE857B] ${
          slim ? 'top-[-4px] text-[18px]' : compact ? 'top-[-3px] text-[21px]' : 'top-[-7px] text-[30px]'
        }`}
      >
        “
      </span>
      <div className="min-w-0 flex-1">{children}</div>
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute right-1 font-serif font-black leading-none text-[#EE857B] ${
          slim ? 'bottom-[-5px] text-[18px]' : compact ? 'bottom-[-6px] text-[21px]' : 'bottom-[-10px] text-[30px]'
        }`}
      >
        ”
      </span>
    </div>
  );
}
