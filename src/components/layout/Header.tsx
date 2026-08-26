"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Container } from "@/components/ui/container";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/", label: "Home" },
  { href: "/browse", label: "Browse" },
  { href: "/upload", label: "Upload" },
  { href: "/leaderboard", label: "Leaderboard" },
];

export function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <Container className="flex h-16 items-center justify-between">
        <Link prefetch={false} href="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-bold">
            NW
          </span>
          <span className="text-base font-semibold tracking-tight">NustWeShare</span>
          <span className="hidden sm:inline text-xs text-muted-foreground ml-1">Past papers. Shared by students.</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1" aria-label="Main">
          {nav.map((item) => {
            const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <Link prefetch={false}
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm font-medium transition-colors min-h-[44px] flex items-center",
                  active ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-accent"
                )}
                aria-current={active ? "page" : undefined}
              >
                {item.label}
              </Link>
            );
          })}
          <Link prefetch={false}
            href="/dashboard"
            className={cn(
              "rounded-lg px-3 py-2 text-sm font-medium transition-colors min-h-[44px] flex items-center",
              pathname.startsWith("/dashboard") ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-accent"
            )}
          >
            Profile
          </Link>
        </nav>

        <div className="hidden md:flex items-center gap-2">
          <Link prefetch={false}
            href="/upload"
            className="inline-flex items-center justify-center rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:bg-slate-800 h-9 px-3 min-h-[36px]"
          >
            Upload Papers
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden inline-flex h-11 w-11 items-center justify-center rounded-xl border bg-background"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            {open ? <path d="M6 18L18 6M6 6l12 12" /> : <path d="M3 12h18M3 6h18M3 18h18" />}
          </svg>
        </button>
      </Container>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t bg-background">
          <Container className="py-3 flex flex-col gap-1">
            {nav.map((item) => (
              <Link prefetch={false}
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "rounded-xl px-3 py-3 text-sm font-medium min-h-[44px] flex items-center",
                  pathname === item.href ? "bg-secondary" : "hover:bg-accent"
                )}
              >
                {item.label}
              </Link>
            ))}
            <Link prefetch={false}
              href="/dashboard"
              onClick={() => setOpen(false)}
              className="rounded-xl px-3 py-3 text-sm font-medium hover:bg-accent min-h-[44px] flex items-center"
            >
              Profile
            </Link>
            <Link prefetch={false}
              href="/upload"
              onClick={() => setOpen(false)}
              className="mt-2 inline-flex items-center justify-center rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:bg-slate-800 h-10 px-5 min-h-[44px]"
            >
              Upload Papers
            </Link>
          </Container>
        </div>
      )}
    </header>
  );
}
