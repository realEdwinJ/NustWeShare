import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function Breadcrumbs({ items, className }: { items: { href?: string; label: string }[]; className?: string }) {
  return (
    <nav aria-label="Breadcrumb" className={cn("flex flex-wrap items-center gap-1 text-sm text-muted-foreground", className)}>
      {items.map((it, i) => (
        <span key={i} className="inline-flex items-center gap-1">
          {i > 0 && <ChevronRight className="size-3.5 opacity-60" aria-hidden="true" />}
          {it.href ? (
            <Link href={it.href} className="rounded-md px-1 hover:text-foreground hover:underline underline-offset-4">
              {it.label}
            </Link>
          ) : (
            <span className="px-1 text-foreground" aria-current="page">
              {it.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}

export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  eyebrow?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0">
        {eyebrow && <div className="mb-2">{eyebrow}</div>}
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
        {description && <div className="mt-1.5 text-sm text-muted-foreground sm:text-base">{description}</div>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
