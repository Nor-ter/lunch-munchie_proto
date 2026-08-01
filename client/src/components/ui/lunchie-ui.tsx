import { forwardRef, type ButtonHTMLAttributes, type HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export const ScreenContainer = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("lm-screen", className)} {...props} />
));
ScreenContainer.displayName = "ScreenContainer";

export const AppCard = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("lm-surface", className)} {...props} />
  ),
);
AppCard.displayName = "AppCard";

export const PrimaryButton = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, type = "button", ...props }, ref) => (
  <button
    ref={ref}
    type={type}
    className={cn("lm-primary-button", className)}
    {...props}
  />
));
PrimaryButton.displayName = "PrimaryButton";

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  "aria-label": string;
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn("lm-icon-button", className)}
      {...props}
    />
  ),
);
IconButton.displayName = "IconButton";

export const StatusBadge = forwardRef<
  HTMLSpanElement,
  HTMLAttributes<HTMLSpanElement>
>(({ className, ...props }, ref) => (
  <span ref={ref} className={cn("lm-status-badge", className)} {...props} />
));
StatusBadge.displayName = "StatusBadge";
