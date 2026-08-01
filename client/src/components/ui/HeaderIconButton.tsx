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
      'relative flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm active:scale-95',
      className,
    )}
    {...props}
  />
));

HeaderIconButton.displayName = 'HeaderIconButton';

export default HeaderIconButton;
