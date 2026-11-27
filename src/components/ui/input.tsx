import * as React from "react";
import { cn } from "@/lib/utils";

const field =
  "flex w-full rounded-xl border border-input bg-surface px-3.5 text-sm text-foreground shadow-xs transition-[border-color,box-shadow] placeholder:text-muted-foreground/80 focus-visible:outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-destructive";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, ...props }, ref) => (
  <input ref={ref} className={cn(field, "h-11", className)} {...props} />
));
Input.displayName = "Input";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...props }, ref) => (
  <textarea ref={ref} className={cn(field, "min-h-[88px] py-2.5 leading-relaxed", className)} {...props} />
));
Textarea.displayName = "Textarea";

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(({ className, children, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      field,
      "h-11 appearance-none bg-[length:16px] bg-[right_0.75rem_center] bg-no-repeat pr-9",
      "bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2393a3bb' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")]",
      className
    )}
    {...props}
  >
    {children}
  </select>
));
Select.displayName = "Select";

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("text-sm font-medium text-foreground", className)} {...props} />;
}

export function FieldHint({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("mt-1.5 text-xs text-muted-foreground", className)} {...props} />;
}

export function FieldError({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p role="alert" className={cn("mt-1.5 text-xs font-medium text-destructive", className)} {...props} />;
}
