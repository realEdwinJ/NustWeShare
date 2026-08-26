"use client";

import { useEffect, useRef } from "react";
import { Container } from "@/components/ui/container";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const hasReloaded = useRef(false);
  useEffect(() => {
    // Auto-reload once: React error #412 (suspend during sync input) shows this boundary on Link click,
    // but hard reload (SSR) succeeds. Auto-trigger reload so user never sees the error.
    if (hasReloaded.current) return;
    // Guard infinite loop: only auto-reload once per session for this URL, and only for #412 / Something went wrong
    const key = `nws-reload-${window.location.pathname}${window.location.search}`;
    if (sessionStorage.getItem(key)) return;
    const msg = error?.message || "";
    const is412 = msg.includes("412") || msg.includes("suspended") || msg.includes("Minified React error");
    // Only auto-reload for navigation errors, not for persistent 500s (avoid loop)
    if (is412 || msg.includes("Something went wrong") || error?.digest) {
      hasReloaded.current = true;
      sessionStorage.setItem(key, "1");
      // Small delay to let React flush, then hard reload to SSR which always works
      const t = setTimeout(() => window.location.reload(), 50);
      return () => clearTimeout(t);
    }
  }, [error]);

  // Also clear the guard when user manually navigates away and back
  useEffect(() => {
    const onNav = () => {
      try {
        sessionStorage.removeItem(`nws-reload-${window.location.pathname}${window.location.search}`);
      } catch {}
    };
    window.addEventListener("popstate", onNav);
    return () => window.removeEventListener("popstate", onNav);
  }, []);

  const handleRetry = () => {
    try {
      reset();
    } catch {}
    if (typeof window !== "undefined") window.location.reload();
  };
  return (
    <Container className="py-16 text-center">
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <p className="mt-1 text-sm text-muted-foreground">Reloading…</p>
      <p className="mt-2 text-sm text-muted-foreground">
        We couldn&apos;t load that page. Please try again. If the problem continues, contact us.
      </p>
      <button
        onClick={handleRetry}
        className="mt-6 inline-flex items-center justify-center rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-slate-800 min-h-[44px]"
      >
        Try again
      </button>
      <p className="mt-4 text-xs text-muted-foreground">Error: {error.message.slice(0, 120)}</p>
    </Container>
  );
}
