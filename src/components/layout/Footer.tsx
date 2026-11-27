import Link from "next/link";
import { Container } from "@/components/ui/container";
import { Logo } from "./Logo";

const REPO = "https://github.com/realEdwinJ/NustWeShare";

export function Footer() {
  const cols = [
    { title: "Explore", links: [["/browse", "Browse faculties"], ["/search", "Search"], ["/leaderboard", "Leaderboard"], ["/library", "My library"]] },
    { title: "Contribute", links: [["/upload", "Upload papers"], ["/register", "Create a profile"], ["/help", "Help & FAQ"]] },
    { title: "Legal", links: [["/copyright", "Copyright & takedown"], ["/privacy", "Privacy"], ["/contact", "Contact"]] },
  ];
  return (
    <footer className="mt-16 border-t bg-surface">
      <Container className="py-12">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-5">
          <div className="space-y-3 lg:col-span-2">
            <Logo />
            <p className="max-w-sm text-sm text-muted-foreground">Past papers, shared by students. Free forever, no paywall, no account required.</p>
            <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">
              An independent student project — not affiliated with, operated by, or endorsed by the Namibia University of Science and Technology.
            </p>
          </div>
          {cols.map((c) => (
            <div key={c.title}>
              <h2 className="mb-3 text-sm font-semibold">{c.title}</h2>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {c.links.map(([href, label]) => (
                  <li key={href}>
                    <Link href={href} className="hover:text-foreground">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-10 flex flex-col justify-between gap-2 border-t pt-6 text-xs text-muted-foreground sm:flex-row">
          <span>© {new Date().getFullYear()} NustWeShare · Community-driven</span>
          <span className="flex gap-4">
            <a href={REPO} target="_blank" rel="noopener noreferrer" className="hover:text-foreground">
              Open source on GitHub
            </a>
            <span>
              Press <kbd className="rounded border px-1 font-mono">/</kbd> to search
            </span>
          </span>
        </div>
      </Container>
    </footer>
  );
}
