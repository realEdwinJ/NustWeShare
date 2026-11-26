import { Bug, Database, FileWarning, MessageSquare } from "lucide-react";
import { ProsePage } from "@/components/layout/ProsePage";

export const metadata = { title: "Contact" };

const ITEMS = [
  { icon: Bug, t: "Report a bug", d: "Something broken or confusing?", href: "https://github.com/realEdwinJ/NustWeShare/issues/new?labels=bug" },
  { icon: Database, t: "Fix academic data", d: "A missing module, wrong name or programme.", href: "https://github.com/realEdwinJ/NustWeShare/issues/new?labels=data" },
  { icon: FileWarning, t: "Takedown request", d: "For rights holders — see the copyright page.", href: "/copyright" },
  { icon: MessageSquare, t: "Ideas & feedback", d: "Tell us what would make revision easier.", href: "https://github.com/realEdwinJ/NustWeShare/discussions" },
];

export default function ContactPage() {
  return (
    <ProsePage title="Contact" intro="A volunteer, student-run project — we read every message.">
      <div className="grid gap-3 sm:grid-cols-2">
        {ITEMS.map((i) => (
          <a key={i.t} href={i.href} className="flex gap-3 rounded-2xl border bg-card p-4 !text-foreground hover:!no-underline hover:border-input" target={i.href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-info-soft text-info"><i.icon className="size-5" /></span>
            <span>
              <span className="block font-medium">{i.t}</span>
              <span className="block text-sm font-normal text-muted-foreground">{i.d}</span>
            </span>
          </a>
        ))}
      </div>
    </ProsePage>
  );
}
