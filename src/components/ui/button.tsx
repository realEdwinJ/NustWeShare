import * as React from "react";
import { cn } from "@/lib/utils";

export type ButtonVariant = "default" | "brand" | "secondary" | "ghost" | "outline" | "destructive" | "link";
export type ButtonSize = "default" | "sm" | "lg" | "icon" | "icon-sm";

const base =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-[background-color,color,box-shadow,transform] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] select-none [&_svg]:size-4 [&_svg]:shrink-0";

const variants: Record<ButtonVariant, string> = {
  default: "bg-primary text-primary-foreground hover:bg-primary-hover shadow-sm",
  brand: "bg-brand text-brand-foreground hover:brightness-105 shadow-sm",
  secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
  ghost: "text-foreground hover:bg-accent",
  outline: "border border-input bg-surface text-foreground hover:bg-accent",
  destructive: "bg-destructive text-destructive-foreground hover:brightness-110",
  link: "text-info underline-offset-4 hover:underline px-0 h-auto",
};

const sizes: Record<ButtonSize, string> = {
  default: "h-10 px-4",
  sm: "h-8 px-3 text-[13px] rounded-lg",
  lg: "h-12 px-6 text-base",
  icon: "h-10 w-10",
  "icon-sm": "h-8 w-8 rounded-lg",
};

export function buttonVariants({ variant = "default", size = "default", className }: { variant?: ButtonVariant; size?: ButtonSize; className?: string } = {}) {
  return cn(base, variants[variant], sizes[size], className);
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", loading, children, disabled, type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={buttonVariants({ variant, size, className })}
      disabled={disabled || loading}
      aria-busy={loading ? "true" : undefined}
      {...props}
    >
      {loading && <Spinner />}
      {children}
    </button>
  )
);
Button.displayName = "Button";

export function Spinner({ className }: { className?: string }) {
  return (
    <svg className={cn("size-4 animate-spin", className)} viewBox="0 0 24 24" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}
