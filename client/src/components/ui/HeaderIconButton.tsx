import { forwardRef, type ButtonHTMLAttributes, type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export function HeaderActionRow({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'header-action-row',
        className,
      )}
      {...props}
    />
  );
}

const HeaderIconButton = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, type = 'button', ...props }, ref) => (
  <button
    ref={ref}
    type={type}
    className={cn(
      'relative flex h-10 w-10 items-center justify-center rounded-full bg-transparent text-[#171717] active:bg-[#F4F3F4] active:scale-95',
      className,
    )}
    {...props}
  />
));

HeaderIconButton.displayName = 'HeaderIconButton';

export default HeaderIconButton;
