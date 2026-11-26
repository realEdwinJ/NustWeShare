import { BellRing, Bookmark, Trophy } from "lucide-react";
import { Container } from "@/components/ui/container";
import { LogoMark } from "@/components/layout/Logo";

export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <Container className="grid gap-10 py-10 sm:py-16 lg:grid-cols-2 lg:items-center">
      <div className="hidden lg:block">
        <LogoMark className="size-12" />
        <h2 className="mt-6 text-3xl font-bold tracking-tight">Study smarter with your classmates.</h2>
        <ul className="mt-6 space-y-4 text-muted-foreground">
          {[
            { i: Trophy, t: "Get credit on the leaderboard for papers you share" },
            { i: Bookmark, t: "Save papers and pick up reading on any device" },
            { i: BellRing, t: "Follow your modules and see new papers first" },
          ].map((x) => (
            <li key={x.t} className="flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-xl bg-info-soft text-info"><x.i className="size-4" /></span>
              {x.t}
            </li>
          ))}
        </ul>
      </div>
      <div className="mx-auto w-full max-w-md rounded-3xl border bg-card p-6 shadow-[var(--shadow-pop)] sm:p-8">
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>
        <div className="mt-6">{children}</div>
      </div>
    </Container>
  );
}
