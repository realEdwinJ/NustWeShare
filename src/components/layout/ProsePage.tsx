import { Container } from "@/components/ui/container";

export function ProsePage({ title, intro, updated, children }: { title: string; intro?: string; updated?: string; children: React.ReactNode }) {
  return (
    <Container className="max-w-3xl py-10 sm:py-14">
      <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
      {intro && <p className="mt-3 text-lg text-muted-foreground">{intro}</p>}
      {updated && <p className="mt-2 text-xs text-muted-foreground">Last updated {updated}</p>}
      <div className="mt-8 space-y-8 text-[15px] leading-relaxed text-foreground/90 [&_a]:font-medium [&_a]:text-info [&_a:hover]:underline [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-foreground [&_li]:mt-1.5 [&_ul]:list-disc [&_ul]:pl-5">
        {children}
      </div>
    </Container>
  );
}
