import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Calendar, Download, Eye, FileText, HardDrive, Layers, User } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Breadcrumbs } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { PaperReader } from "@/components/viewer/PaperReader";
import { ViewTracker } from "@/components/papers/ViewTracker";
import { ReportDialog } from "@/components/report/ReportDialog";
import { SaveButton } from "@/components/papers/SaveButton";
import { ShareButton } from "@/components/papers/ShareButton";
import { EditPaperDialog } from "@/components/papers/EditPaperDialog";
import { TypeBadge } from "@/components/papers/ModulePapers";
import { getPaperDetail, listModulePapers } from "@/lib/papers/queries";
import { assessmentLabel, compactNumber, downloadFilename, formatBytes, timeAgo } from "@/lib/papers/format";
import { getCurrentUser } from "@/lib/auth/current";
import { isUuid } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) return { title: "Paper not found" };
  try {
    const d = await getPaperDetail(id);
    if (!d || !d.module) return { title: "Paper not found" };
    const label = assessmentLabel(d.paper.assessmentType, d.paper.assessmentNumber);
    return {
      title: `${d.module.code} ${label} ${d.paper.academicYear} — ${d.module.name}`,
      description: `Read or download the ${d.paper.academicYear} semester ${d.paper.semester} ${label.toLowerCase()} for ${d.module.code} ${d.module.name}. Free NUST past paper on NustWeShare.`,
      robots: d.paper.status === "deleted" ? { index: false } : undefined,
    };
  } catch {
    return { title: "Past paper" };
  }
}

export default async function PaperPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const d = await getPaperDetail(id);
  if (!d || !d.module) notFound();
  const { paper, module: mod } = d;

  if (paper.status === "deleted") {
    return (
      <Container className="py-16">
        <EmptyState
          icon={<FileText />}
          title="This paper is no longer available"
          description="It was removed by the uploader, a moderator, or after several community reports."
        >
          <Link href={`/modules/${mod.code.toLowerCase()}`} className={buttonVariants()}>
            See other {mod.code} papers
          </Link>
        </EmptyState>
      </Container>
    );
  }

  const [user, siblings] = await Promise.all([getCurrentUser(), listModulePapers(mod.id)]);
  const idx = siblings.findIndex((s) => s.id === paper.id);
  const newer = idx > 0 ? siblings[idx - 1] : null;
  const older = idx >= 0 && idx < siblings.length - 1 ? siblings[idx + 1] : null;
  const related = siblings.filter((s) => s.id !== paper.id).slice(0, 8);

  let saved = false;
  if (user) {
    const { getDb } = await import("@/lib/db");
    const { bookmarks } = await import("@/db/schema/bookmarks");
    const { and, eq } = await import("drizzle-orm");
    const r = await getDb().select({ id: bookmarks.id }).from(bookmarks).where(and(eq(bookmarks.userId, user.id), eq(bookmarks.paperId, paper.id))).limit(1);
    saved = r.length > 0;
  }
  const canEdit = !!user && (user.role === "admin" || (d.uploaderIds.length > 0 && d.uploaderIds.every((u) => u === user.id)));

  const label = assessmentLabel(paper.assessmentType, paper.assessmentNumber);
  const title = `${mod.code} ${label} — ${paper.academicYear}`;
  const naming = user?.preferences?.downloadNaming === "original" ? "?name=original" : "";
  const downloadUrl = `/api/papers/${paper.id}/download${naming}`;
  const filename = downloadFilename({ moduleCode: mod.code, ...paper });

  return (
    <Container className="py-6 sm:py-8">
      <ViewTracker paperId={paper.id} moduleCode={mod.code} label={`${label} ${paper.academicYear}`} />
      <Breadcrumbs items={[{ href: "/browse", label: "Browse" }, { href: `/modules/${mod.code.toLowerCase()}`, label: mod.code }, { label: `${label} ${paper.academicYear}` }]} />

      <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <TypeBadge type={paper.assessmentType} number={paper.assessmentNumber} />
            <span className="text-sm text-muted-foreground">
              {paper.academicYear} · Semester {paper.semester}
            </span>
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
            <Link href={`/modules/${mod.code.toLowerCase()}`} className="font-mono hover:underline">
              {mod.code}
            </Link>{" "}
            {label} <span className="text-muted-foreground">{paper.academicYear}</span>
          </h1>
          <p className="mt-1 text-muted-foreground">{mod.name}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {d.canonical && (
            <a href={downloadUrl} className={buttonVariants({ variant: "default" })} download={filename}>
              <Download /> Download PDF
            </a>
          )}
          <SaveButton paperId={paper.id} initial={saved} />
          <ShareButton title={title} text={`${title} — ${mod.name}`} />
          {canEdit && (
            <EditPaperDialog
              paper={{ id: paper.id, moduleCode: mod.code, academicYear: paper.academicYear, semester: paper.semester, assessmentType: paper.assessmentType, assessmentNumber: paper.assessmentNumber }}
            />
          )}
          <ReportDialog paperId={paper.id} />
        </div>
      </div>

      <div className="mt-6">
        {d.canonical ? (
          <PaperReader paperId={paper.id} title={title} />
        ) : (
          <EmptyState icon={<FileText />} title="File not available yet" description="The file for this paper is still processing or missing. Try again later." />
        )}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        {older ? (
          <Link href={`/papers/${older.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
            <ArrowLeft /> {assessmentLabel(older.assessmentType, older.assessmentNumber)} {older.academicYear}
          </Link>
        ) : (
          <span />
        )}
        {newer && (
          <Link href={`/papers/${newer.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
            {assessmentLabel(newer.assessmentType, newer.assessmentNumber)} {newer.academicYear} <ArrowRight />
          </Link>
        )}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-2.5 text-sm">
              {[
                { icon: Layers, k: "Pages", v: d.canonical?.pageCount ?? "—" },
                { icon: HardDrive, k: "File size", v: formatBytes(d.canonical?.fileSize) },
                { icon: Eye, k: "Reads", v: compactNumber(paper.views) },
                { icon: Download, k: "Downloads", v: compactNumber(paper.downloads) },
                { icon: Calendar, k: "Added", v: timeAgo(paper.createdAt) },
              ].map((r) => (
                <div key={r.k} className="flex items-center justify-between gap-3">
                  <dt className="flex items-center gap-2 text-muted-foreground"><r.icon className="size-4" /> {r.k}</dt>
                  <dd className="font-medium tabular-nums">{r.v}</dd>
                </div>
              ))}
              <div className="flex items-center justify-between gap-3 border-t pt-3">
                <dt className="flex items-center gap-2 text-muted-foreground"><User className="size-4" /> Shared by</dt>
                <dd>
                  {d.uploader ? (
                    <Link href={`/u/${d.uploader.username}`} className="flex items-center gap-2 font-medium hover:underline">
                      <Avatar name={d.uploader.displayName} color={d.uploader.avatarColor} emoji={d.uploader.avatarEmoji} size="xs" />
                      {d.uploader.displayName}
                    </Link>
                  ) : (
                    <span className="font-medium">Anonymous</span>
                  )}
                </dd>
              </div>
            </dl>
            <p className="mt-4 rounded-xl bg-muted px-3 py-2.5 text-xs text-muted-foreground">
              Saves as <span className="font-mono text-foreground">{filename}</span>
            </p>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between pb-3">
            <CardTitle>More {mod.code} papers</CardTitle>
            <Link href={`/modules/${mod.code.toLowerCase()}`} className="text-sm font-medium text-info hover:underline">
              View all {siblings.length}
            </Link>
          </CardHeader>
          <CardContent>
            {related.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                This is the only {mod.code} paper so far.{" "}
                <Link href={`/upload?module=${mod.code}`} className="font-medium text-info hover:underline">
                  Upload another
                </Link>
              </p>
            ) : (
              <ul className="grid gap-2 sm:grid-cols-2">
                {related.map((s) => (
                  <li key={s.id}>
                    <Link href={`/papers/${s.id}`} className="flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-sm hover:bg-accent">
                      <span className="flex items-center gap-2">
                        <TypeBadge type={s.assessmentType} number={s.assessmentNumber} />
                        <span className="tabular-nums">{s.academicYear}</span>
                        <span className="text-muted-foreground">S{s.semester}</span>
                      </span>
                      <span className="text-xs text-muted-foreground">{s.pageCount ? `${s.pageCount} pp` : ""}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <p className="mt-8 text-center text-xs text-muted-foreground">
        Shortcuts: <kbd className="rounded border px-1 font-mono">←</kbd> <kbd className="rounded border px-1 font-mono">→</kbd> pages ·{" "}
        <kbd className="rounded border px-1 font-mono">+</kbd> <kbd className="rounded border px-1 font-mono">−</kbd> zoom ·{" "}
        <kbd className="rounded border px-1 font-mono">Ctrl F</kbd> find · <kbd className="rounded border px-1 font-mono">F</kbd> full screen ·{" "}
        <kbd className="rounded border px-1 font-mono">R</kbd> rotate
      </p>
    </Container>
  );
}
