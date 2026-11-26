import { redirect } from "next/navigation";
import { Container } from "@/components/ui/container";
import { PageHeader } from "@/components/ui/page-header";
import { getCurrentUser } from "@/lib/auth/current";
import { getSiteStats } from "@/lib/papers/queries";
import { compactNumber } from "@/lib/papers/format";
import { AdminClient } from "./AdminClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Moderation", robots: { index: false } };

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin");
  if (user.role !== "admin") redirect("/");
  const stats = await getSiteStats();
  return (
    <Container className="py-8 sm:py-10">
      <PageHeader title="Moderation" description="Review reported papers. Dismiss false reports or remove a paper (its file is deleted from storage)." />
      <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[["Active papers", stats.papers], ["Modules covered", stats.modulesCovered], ["Downloads", stats.downloads], ["Contributors", stats.contributors]].map(([k, v]) => (
          <div key={k as string} className="rounded-2xl border bg-card p-4">
            <dt className="text-xs text-muted-foreground">{k}</dt>
            <dd className="mt-1 text-2xl font-bold tabular-nums">{compactNumber(v as number)}</dd>
          </div>
        ))}
      </dl>
      <AdminClient />
    </Container>
  );
}
