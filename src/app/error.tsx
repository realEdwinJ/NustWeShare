"use client";

import { Container } from "@/components/ui/container";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const handleRetry = () => {
    try {
      reset();
    } catch {}
    // Hard reload fixes React error #412 where client navigation suspends but SSR succeeds — refresh loads the same URL via SSR
    if (typeof window !== "undefined") window.location.reload();
  };
  return (
    <Container className="py-16 text-center">
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
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
