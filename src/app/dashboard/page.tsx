import Link from "next/link";
import { redirect } from "next/navigation";
import { Download, Eye, FileText, Settings, Trophy, Upload, User } from "lucide-react";
import { Container } from "@/components/ui/container";
import { PageHeader } from "@/components/ui/page-header";
import { buttonVariants } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { getCurrentUser } from "@/lib/auth/current";
import { getLeaderboard, listUserUploads } from "@/lib/papers/queries";
import { compactNumber, formatDate } from "@/lib/papers/format";
import { MyUploads } from "./MyUploads";

export const dynamic = "force-dynamic";
export const metadata = { title: "Dashboard", robots: { index: false } };

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/dashboard");
  const [uploads, lb] = await Promise.all([listUserUploads(user.id, { includeHidden: true }), getLeaderboard({ limit: 500 })]);
  const active = uploads.filter((u) => u.status === "active" && u.isCanonical);
  const rank = lb.rows.find((r) => r.username === user.username)?.rank ?? null;
  const stats = [
    { k: "Papers shared", v: active.length, icon: FileText },
    { k: "Times read", v: active.reduce((s, u) => s + u.views, 0), icon: Eye },
    { k: "Downloads", v: active.reduce((s, u) => s + u.downloads, 0), icon: Download },
    { k: "Leaderboard", v: rank ? `#${rank}` : "—", icon: Trophy },
  ];

  return (
    <Container className="py-8 sm:py-10">
      <PageHeader
        eyebrow={<Avatar name={user.displayName} color={user.avatarColor} emoji={user.avatarEmoji} size="lg" />}
        title={`Hi, ${user.displayName}`}
        description={<>@{user.username} · member since {formatDate(user.createdAt, { month: "long", year: "numeric" })}</>}
        actions={
          <>
            <Link href={`/u/${user.username}`} className={buttonVariants({ variant: "outline" })}><User /> Public profile</Link>
            <Link href="/settings" className={buttonVariants({ variant: "outline" })}><Settings /> Settings</Link>
            <Link href="/upload" className={buttonVariants({ variant: "brand" })}><Upload /> Upload</Link>
          </>
        }
      />

      <dl className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.k} className="rounded-2xl border bg-card p-5">
            <dt className="flex items-center gap-2 text-sm text-muted-foreground"><s.icon className="size-4" /> {s.k}</dt>
            <dd className="mt-1 text-3xl font-bold tabular-nums tracking-tight">{typeof s.v === "number" ? compactNumber(s.v) : s.v}</dd>
          </div>
        ))}
      </dl>
      {!user.showOnLeaderboard && <p className="mt-3 text-xs text-muted-foreground">You&apos;re hidden from the leaderboard (change in Settings → Privacy).</p>}

      <section className="mt-10">
        <h2 className="text-lg font-semibold">My uploads</h2>
        <p className="text-sm text-muted-foreground">Fix details, hide your name, or remove a paper you shared.</p>
        <div className="mt-4">
          {uploads.length === 0 ? (
            <EmptyState icon={<Upload />} title="You haven't shared a paper yet" description="Your first upload puts you on the leaderboard.">
              <Link href="/upload" className={buttonVariants({ variant: "brand" })}>Upload a paper</Link>
            </EmptyState>
          ) : (
            <MyUploads
              items={uploads.map((u) => ({
                fileId: u.fileId,
                paperId: u.id,
                moduleCode: u.moduleCode,
                moduleName: u.moduleName,
                academicYear: u.academicYear,
                semester: u.semester,
                assessmentType: u.assessmentType,
                assessmentNumber: u.assessmentNumber,
                views: u.views,
                downloads: u.downloads,
                status: u.status,
                isBackup: !u.isCanonical,
                hideUploader: u.hideUploader,
                uploadedAt: u.uploadedAt.toISOString(),
              }))}
            />
          )}
        </div>
      </section>
    </Container>
  );
}
