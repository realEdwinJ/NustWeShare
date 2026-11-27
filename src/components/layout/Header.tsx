"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Bookmark, ChevronDown, LayoutDashboard, LogIn, LogOut, Menu, Monitor, Moon, Search, Settings, Shield, Sun, Upload, User, X,
} from "lucide-react";
import { Container } from "@/components/ui/container";
import { Avatar } from "@/components/ui/avatar";
import { Kbd } from "@/components/ui/kbd";
import { buttonVariants } from "@/components/ui/button";
import { Dropdown, DropdownItem, DropdownLabel, DropdownSeparator } from "@/components/ui/dropdown";
import { CommandPalette, useCommandPalette } from "@/components/search/CommandPalette";
import { useSession } from "@/components/providers/session";
import { useTheme, type ThemePref } from "@/components/providers/theme";
import { useToast } from "@/components/ui/toast";
import { Logo } from "./Logo";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/browse", label: "Browse" },
  { href: "/search", label: "Search" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/library", label: "Library" },
];

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const opts: { v: ThemePref; icon: typeof Sun; label: string }[] = [
    { v: "light", icon: Sun, label: "Light" },
    { v: "dark", icon: Moon, label: "Dark" },
    { v: "system", icon: Monitor, label: "System" },
  ];
  const Current = theme === "dark" ? Moon : theme === "light" ? Sun : Monitor;
  return (
    <Dropdown
      label="Theme"
      trigger={({ toggle, open, id }) => (
        <button onClick={toggle} aria-expanded={open} aria-controls={id} aria-haspopup="menu" className={buttonVariants({ variant: "ghost", size: "icon" })} aria-label={`Theme: ${theme}`}>
          <Current />
        </button>
      )}
      className="min-w-[10rem]"
    >
      {opts.map((o) => (
        <DropdownItem key={o.v} onSelect={() => setTheme(o.v)}>
          <o.icon />
          <span className="flex-1">{o.label}</span>
          {theme === o.v && <span className="size-1.5 rounded-full bg-info" />}
        </DropdownItem>
      ))}
    </Dropdown>
  );
}

function UserMenu() {
  const user = useSession();
  const router = useRouter();
  const { toast } = useToast();
  if (!user) {
    return (
      <div className="hidden items-center gap-1 sm:flex">
        <Link href="/login" className={buttonVariants({ variant: "ghost", size: "sm" })}>
          Log in
        </Link>
        <Link href="/register" className={buttonVariants({ variant: "outline", size: "sm" })}>
          Create profile
        </Link>
      </div>
    );
  }
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    toast({ title: "Signed out", tone: "success" });
    router.push("/");
    router.refresh();
  }
  return (
    <Dropdown
      label="Account"
      trigger={({ toggle, open, id }) => (
        <button
          onClick={toggle}
          aria-expanded={open}
          aria-controls={id}
          aria-haspopup="menu"
          className="flex items-center gap-1.5 rounded-full p-0.5 pr-1.5 hover:bg-accent"
          aria-label="Account menu"
        >
          <Avatar name={user.displayName} color={user.avatarColor} emoji={user.avatarEmoji} size="sm" />
          <ChevronDown className="size-3.5 text-muted-foreground" />
        </button>
      )}
    >
      <DropdownLabel>
        <span className="block text-sm font-medium text-foreground">{user.displayName}</span>@{user.username}
      </DropdownLabel>
      <DropdownSeparator />
      <DropdownItem href={`/u/${user.username}`}><User /> Public profile</DropdownItem>
      <DropdownItem href="/dashboard"><LayoutDashboard /> Dashboard & uploads</DropdownItem>
      <DropdownItem href="/library"><Bookmark /> Saved & recent</DropdownItem>
      <DropdownItem href="/settings"><Settings /> Settings</DropdownItem>
      {user.role === "admin" && <DropdownItem href="/admin"><Shield /> Moderation</DropdownItem>}
      <DropdownSeparator />
      <DropdownItem onSelect={logout}><LogOut /> Log out</DropdownItem>
    </Dropdown>
  );
}

export function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { open: searchOpen, setOpen: setSearchOpen } = useCommandPalette();
  const user = useSession();
  const [mac, setMac] = useState(false);

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => setMac(/Mac|iPhone|iPad/.test(navigator.platform)), []);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
  }, [open]);

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/85 backdrop-blur-md supports-[backdrop-filter]:bg-background/70">
      <Container className="flex h-16 items-center gap-3">
        <Link href="/" className="mr-2 shrink-0 rounded-lg" aria-label="NustWeShare home">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-0.5 md:flex" aria-label="Main">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive(item.href) ? "bg-secondary text-secondary-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
              aria-current={isActive(item.href) ? "page" : undefined}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1.5">
          <button
            onClick={() => setSearchOpen(true)}
            className="hidden h-9 w-56 items-center gap-2 rounded-xl border bg-surface px-3 text-sm text-muted-foreground transition-colors hover:border-input hover:text-foreground lg:flex"
            aria-label="Search (Ctrl+K)"
          >
            <Search className="size-4" />
            <span className="flex-1 text-left">Search modules…</span>
            <Kbd>{mac ? "⌘" : "Ctrl"} K</Kbd>
          </button>
          <button onClick={() => setSearchOpen(true)} className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "lg:hidden")} aria-label="Search">
            <Search />
          </button>
          <ThemeToggle />
          <Link href="/upload" className={cn(buttonVariants({ variant: "brand", size: "sm" }), "hidden sm:inline-flex")}>
            <Upload /> Upload
          </Link>
          <UserMenu />
          <button
            className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "md:hidden")}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X /> : <Menu />}
          </button>
        </div>
      </Container>

      {open && (
        <div id="mobile-menu" className="fixed inset-x-0 top-16 bottom-0 z-40 overflow-y-auto border-t bg-background animate-fade-in md:hidden">
          <Container className="flex flex-col gap-1 py-4">
            {[{ href: "/", label: "Home" }, ...nav, { href: "/upload", label: "Upload papers" }].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn("rounded-xl px-3 py-3 text-base font-medium", (item.href === "/" ? pathname === "/" : isActive(item.href)) ? "bg-secondary" : "hover:bg-accent")}
              >
                {item.label}
              </Link>
            ))}
            <div className="my-3 h-px bg-border" />
            {user ? (
              <>
                <Link href="/dashboard" className="rounded-xl px-3 py-3 text-base font-medium hover:bg-accent">Dashboard</Link>
                <Link href="/settings" className="rounded-xl px-3 py-3 text-base font-medium hover:bg-accent">Settings</Link>
                <Link href={`/u/${user.username}`} className="rounded-xl px-3 py-3 text-base font-medium hover:bg-accent">Public profile</Link>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Link href="/login" className={buttonVariants({ variant: "outline", size: "lg" })}>
                  <LogIn /> Log in
                </Link>
                <Link href="/register" className={buttonVariants({ variant: "default", size: "lg" })}>
                  Create profile
                </Link>
              </div>
            )}
          </Container>
        </div>
      )}

      <CommandPalette open={searchOpen} onClose={() => setSearchOpen(false)} />
    </header>
  );
}
