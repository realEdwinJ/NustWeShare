"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCw } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Button, buttonVariants } from "@/components/ui/button";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const reloaded = useRef(false);
  useEffect(() => {
    // A transient RSC/navigation failure usually succeeds on a full reload — try that once per URL.
    if (reloaded.current) return;
    const key = `nws-reload-${location.pathname}${location.search}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      return;
    }
    reloaded.current = true;
    const t = setTimeout(() => location.reload(), 60);
    return () => clearTimeout(t);
  }, [error]);

  return (
    <Container className="flex min-h-[60vh] flex-col items-center justify-center py-16 text-center">
      <div className="mb-5 flex size-14 items-center justify-center rounded-2xl bg-warning-soft text-warning">
        <AlertTriangle className="size-7" />
      </div>
      <h1 className="text-2xl font-semibold tracking-tight">Something went wrong</h1>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">We couldn&apos;t load this page. It&apos;s usually temporary — please try again.</p>
      <div className="mt-6 flex gap-2">
        <Button
          onClick={() => {
            try {
              sessionStorage.removeItem(`nws-reload-${location.pathname}${location.search}`);
            } catch {}
            reset();
            location.reload();
          }}
        >
          <RotateCw /> Try again
        </Button>
        <Link href="/" className={buttonVariants({ variant: "outline" })}>
          Go home
        </Link>
      </div>
      {error.digest && <p className="mt-6 font-mono text-xs text-muted-foreground">Ref: {error.digest}</p>}
    </Container>
  );
}
