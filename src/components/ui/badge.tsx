import * as React from "react";
import { cn } from "@/lib/utils";

const variants = {
  default: "bg-primary text-primary-foreground",
  secondary: "bg-secondary text-secondary-foreground",
  outline: "border text-muted-foreground",
  brand: "bg-brand-soft text-warning",
  info: "bg-info-soft text-info",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  destructive: "bg-destructive-soft text-destructive",
} as const;

export function Badge({ className, variant = "secondary", ...props }: React.HTMLAttributes<HTMLSpanElement> & { variant?: keyof typeof variants }) {
  return (
    <span
      className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap [&_svg]:size-3", variants[variant], className)}
      {...props}
    />
  );
}
