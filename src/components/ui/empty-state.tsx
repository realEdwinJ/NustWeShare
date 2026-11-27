import { cn } from "@/lib/utils";

export function EmptyState({
  icon,
  title,
  description,
  children,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-12 text-center", className)}>
      {icon && <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground [&_svg]:size-6">{icon}</div>}
      <p className="text-base font-semibold">{title}</p>
      {description && <div className="mt-1.5 max-w-md text-sm text-muted-foreground">{description}</div>}
      {children && <div className="mt-5 flex flex-wrap items-center justify-center gap-2">{children}</div>}
    </div>
  );
}
