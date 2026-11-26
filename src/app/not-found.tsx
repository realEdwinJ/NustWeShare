import Link from "next/link";
import { Compass } from "lucide-react";
import { Container } from "@/components/ui/container";
import { buttonVariants } from "@/components/ui/button";

export const metadata = { title: "Page not found", robots: { index: false } };

export default function NotFound() {
  return (
    <Container className="flex min-h-[60vh] flex-col items-center justify-center py-16 text-center">
      <div className="mb-5 flex size-14 items-center justify-center rounded-2xl bg-info-soft text-info">
        <Compass className="size-7" />
      </div>
      <p className="font-mono text-sm text-muted-foreground">404</p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight">We couldn&apos;t find that page</h1>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">The link may be old, or the paper may have been removed. Try searching for the module instead.</p>
      <div className="mt-6 flex gap-2">
        <Link href="/search" className={buttonVariants()}>Search modules</Link>
        <Link href="/" className={buttonVariants({ variant: "outline" })}>Go home</Link>
      </div>
    </Container>
  );
}
