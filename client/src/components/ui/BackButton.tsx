import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

const BackButton = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ className, type = 'button', children, ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(
        'flex size-9 items-center justify-center rounded-full bg-white text-[#1A1A1A] shadow-sm transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F4515E]',
        className,
      )}
      {...props}
    >
      {children ?? <ArrowLeft size={17} aria-hidden="true" />}
    </button>
  ),
);

BackButton.displayName = 'BackButton';

export default BackButton;
