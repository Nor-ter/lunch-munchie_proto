import { englishText } from '@shared/englishCopy';
import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

const BackButton = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ className, type = 'button', children, ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(
        'flex size-9 items-center justify-center rounded-full bg-transparent text-[#171717] transition-colors active:bg-[#F4F3F4] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#AA1A0D]',
        className,
      )}
      {...props}
    >
      {englishText(children ?? <ArrowLeft size={17} aria-hidden="true" />)}
    </button>
  ),
);

BackButton.displayName = 'BackButton';

export default BackButton;
