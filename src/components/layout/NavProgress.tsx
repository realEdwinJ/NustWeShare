"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

/** Thin top bar shown while a client-side navigation is in flight. */
export function NavProgress() {
  const pathname = usePathname();
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement)?.closest?.("a");
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const href = a.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("/api/")) return;
      try {
        const url = new URL(href, location.href);
        if (url.origin !== location.origin || (url.pathname === location.pathname && url.search === location.search)) return;
      } catch {
        return;
      }
      setState("loading");
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setState("idle"), 15_000); // fail-safe
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  useEffect(() => {
    setState((s) => (s === "loading" ? "done" : s));
    const t = setTimeout(() => setState("idle"), 300);
    return () => clearTimeout(t);
  }, [pathname]);

  if (state === "idle") return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[80] h-0.5" role="progressbar" aria-label="Loading page" aria-busy={state === "loading"}>
      <div
        className="h-full bg-info shadow-[0_0_8px_var(--info)] transition-[width,opacity] ease-out"
        style={{ width: state === "loading" ? "80%" : "100%", opacity: state === "done" ? 0 : 1, transitionDuration: state === "loading" ? "8s" : "250ms" }}
      />
    </div>
  );
}
