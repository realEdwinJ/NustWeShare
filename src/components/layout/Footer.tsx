import Link from "next/link";
import { Container } from "@/components/ui/container";

export function Footer() {
  return (
    <footer className="border-t bg-muted/30">
      <Container className="py-10">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground text-xs font-bold">
                NW
              </span>
              <span className="font-semibold">NustWeShare</span>
            </div>
            <p className="text-sm text-muted-foreground">Past papers. Shared by students.</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              NustWeShare is an independent student/community project and is not affiliated with, operated by, or
              officially endorsed by NUST unless explicit permission is obtained.
            </p>
          </div>
          <div>
            <h4 className="text-sm font-semibold mb-3">Explore</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/browse" className="hover:text-foreground">
                  Browse
                </Link>
              </li>
              <li>
                <Link href="/leaderboard" className="hover:text-foreground">
                  Leaderboard
                </Link>
              </li>
              <li>
                <Link href="/upload" className="hover:text-foreground">
                  Upload Papers
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold mb-3">Legal</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/copyright" className="hover:text-foreground">
                  Copyright & Takedown
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-foreground">
                  Contact
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-foreground">
                  Privacy
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold mb-3">Community</h4>
            <p className="text-sm text-muted-foreground">Open-source on GitHub. Help the next NUST student — every paper helps.</p>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex text-sm font-medium hover:underline"
            >
              View on GitHub →
            </a>
          </div>
        </div>
        <div className="mt-8 border-t pt-6 flex flex-col sm:flex-row justify-between gap-2 text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} NustWeShare. Community-driven. No paywall.</span>
          <span>Built for NUST students. Fast. Simple. Free.</span>
        </div>
      </Container>
    </footer>
  );
}
