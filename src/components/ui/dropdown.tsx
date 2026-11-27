"use client";

import { createContext, useContext, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const Ctx = createContext<{ close: () => void }>({ close: () => {} });

export function Dropdown({
  trigger,
  children,
  align = "end",
  className,
  label,
}: {
  trigger: (props: { open: boolean; toggle: () => void; id: string }) => React.ReactNode;
  children: React.ReactNode;
  align?: "start" | "end";
  className?: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const items = Array.from(menuRef.current?.querySelectorAll<HTMLElement>("[role=menuitem]") ?? []);
        if (!items.length) return;
        const idx = items.indexOf(document.activeElement as HTMLElement);
        const next = e.key === "ArrowDown" ? (idx + 1) % items.length : (idx - 1 + items.length) % items.length;
        items[next]?.focus();
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    requestAnimationFrame(() => menuRef.current?.querySelector<HTMLElement>("[role=menuitem]")?.focus());
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <Ctx.Provider value={{ close: () => setOpen(false) }}>
      <div ref={ref} className="relative">
        {trigger({ open, toggle: () => setOpen((v) => !v), id })}
        {open && (
          <div
            ref={menuRef}
            id={id}
            role="menu"
            aria-label={label}
            className={cn(
              "absolute z-50 mt-2 min-w-[14rem] overflow-hidden rounded-xl border bg-card p-1.5 shadow-[var(--shadow-pop)] animate-pop-in",
              align === "end" ? "right-0" : "left-0",
              className
            )}
          >
            {children}
          </div>
        )}
      </div>
    </Ctx.Provider>
  );
}

const itemCls =
  "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-foreground outline-none hover:bg-accent focus:bg-accent [&_svg]:size-4 [&_svg]:text-muted-foreground";

export function DropdownItem({
  href,
  onSelect,
  children,
  destructive,
}: {
  href?: string;
  onSelect?: () => void;
  children: React.ReactNode;
  destructive?: boolean;
}) {
  const { close } = useContext(Ctx);
  const cls = cn(itemCls, destructive && "text-destructive [&_svg]:text-destructive");
  if (href)
    return (
      <Link href={href} role="menuitem" className={cls} onClick={close}>
        {children}
      </Link>
    );
  return (
    <button
      type="button"
      role="menuitem"
      className={cls}
      onClick={() => {
        close();
        onSelect?.();
      }}
    >
      {children}
    </button>
  );
}

export function DropdownSeparator() {
  return <div className="my-1.5 h-px bg-border" role="separator" />;
}

export function DropdownLabel({ children }: { children: React.ReactNode }) {
  return <div className="px-2.5 pb-1.5 pt-1 text-xs text-muted-foreground">{children}</div>;
}
