import { cn } from "@/lib/utils";
export function Progress({ value, className, tone = "info" }: { value: number; className?: string; tone?: "info" | "success" | "brand" | "destructive" }) {
  const toneCls = { info: "bg-info", success: "bg-success", brand: "bg-brand", destructive: "bg-destructive" }[tone];
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-muted", className)} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(v)}>
      <div className={cn("h-full rounded-full transition-[width] duration-300 ease-out", toneCls)} style={{ width: `${v}%` }} />
    </div>
  );
}
