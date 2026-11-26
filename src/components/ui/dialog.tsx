"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/** Accessible modal built on native <dialog> (focus trap, Esc, inert background for free). */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  const width = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl", xl: "max-w-4xl" }[size];
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose(); // backdrop click
      }}
      className={cn(
        "m-auto w-[calc(100%-2rem)] rounded-2xl border bg-card p-0 text-card-foreground shadow-[var(--shadow-pop)] backdrop:bg-transparent",
        width,
        className
      )}
      aria-labelledby="dialog-title"
    >
      {open && (
        <div className="flex max-h-[85vh] flex-col">
          <div className="flex items-start justify-between gap-4 border-b px-5 py-4">
            <div className="min-w-0">
              <h2 id="dialog-title" className="text-base font-semibold tracking-tight">
                {title}
              </h2>
              {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="-mr-1 inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
              aria-label="Close"
            >
              <X className="size-4" />
            </button>
          </div>
          <div className="overflow-y-auto px-5 py-4">{children}</div>
          {footer && <div className="flex flex-wrap justify-end gap-2 border-t px-5 py-3.5">{footer}</div>}
        </div>
      )}
    </dialog>
  );
}
