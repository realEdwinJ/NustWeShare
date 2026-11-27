import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-8", className)} aria-hidden="true">
      <rect width="32" height="32" rx="9" fill="#0f2a4f" />
      <path d="M10 22.5V9.5l12 13V9.5" stroke="#fff" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <circle cx="25" cy="7" r="3" fill="#f2a516" />
    </svg>
  );
}

export function Logo({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      {!compact && (
        <span className="text-[15px] font-semibold tracking-tight">
          Nust<span className="text-warning dark:text-brand">We</span>Share
        </span>
      )}
    </span>
  );
}
