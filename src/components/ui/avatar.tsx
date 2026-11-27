import { cn } from "@/lib/utils";

const COLORS: Record<string, string> = {
  indigo: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-300",
  sky: "bg-sky-500/15 text-sky-600 dark:text-sky-300",
  emerald: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300",
  amber: "bg-amber-500/20 text-amber-700 dark:text-amber-300",
  rose: "bg-rose-500/15 text-rose-600 dark:text-rose-300",
  violet: "bg-violet-500/15 text-violet-600 dark:text-violet-300",
  teal: "bg-teal-500/15 text-teal-600 dark:text-teal-300",
  orange: "bg-orange-500/15 text-orange-600 dark:text-orange-300",
  slate: "bg-slate-500/15 text-slate-600 dark:text-slate-300",
};
export const AVATAR_SWATCH: Record<string, string> = {
  indigo: "bg-indigo-500", sky: "bg-sky-500", emerald: "bg-emerald-500", amber: "bg-amber-500", rose: "bg-rose-500",
  violet: "bg-violet-500", teal: "bg-teal-500", orange: "bg-orange-500", slate: "bg-slate-500",
};

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Avatar({
  name,
  color = "indigo",
  emoji,
  size = "md",
  className,
}: {
  name: string;
  color?: string;
  emoji?: string | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  const s = { xs: "size-6 text-[10px]", sm: "size-8 text-xs", md: "size-10 text-sm", lg: "size-14 text-lg", xl: "size-20 text-2xl" }[size];
  return (
    <span
      className={cn("inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold", COLORS[color] ?? COLORS.indigo, s, className)}
      aria-hidden="true"
    >
      {emoji ? <span className={size === "xl" ? "text-4xl" : size === "lg" ? "text-2xl" : ""}>{emoji}</span> : initials(name)}
    </span>
  );
}
