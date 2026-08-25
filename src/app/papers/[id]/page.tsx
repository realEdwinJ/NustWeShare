import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/container";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PDFViewer } from "@/components/viewer/PDFViewer";
import { ViewTracker } from "@/components/papers/ViewTracker";
import { ReportDialog } from "@/components/report/ReportDialog";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const { getDb } = await import("@/lib/db");
    const { papers } = await import("@/db/schema/papers");
    const { modules } = await import("@/db/schema/modules");
    const { eq } = await import("drizzle-orm");
    const db = getDb();
    const pap = await db.select().from(papers).where(eq(papers.id, id)).limit(1);
    if (pap.length === 0) return { title: "Paper not found" };
    const mod = await db.select().from(modules).where(eq(modules.id, pap[0].moduleId)).limit(1);
    const code = mod[0]?.code ?? "Paper";
    const year = pap[0].academicYear;
    const type = pap[0].assessmentType;
    const num = pap[0].assessmentNumber ? ` ${pap[0].assessmentNumber}` : "";
    return { title: `${code} ${year} ${type}${num} | NustWeShare`, description: `${code} — ${mod[0]?.name ?? ""} — ${year} ${type}` };
  } catch {
    return { title: "Paper | NustWeShare" };
  }
}

export default async function PaperPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let paper: any = null;
  let moduleData: any = null;
  let canonical: any = null;
  let error: string | null = null;

  try {
    const { getDb } = await import("@/lib/db");
    const { papers } = await import("@/db/schema/papers");
    const { modules } = await import("@/db/schema/modules");
    const { eq } = await import("drizzle-orm");
    const { getCanonicalFile } = await import("@/lib/papers/canonical");
    const db = getDb();
    const pap = await db.select().from(papers).where(eq(papers.id, id)).limit(1);
    if (pap.length === 0) return notFound();
    paper = pap[0];
    if (paper.status === "deleted") {
      return (
        <Container className="py-16 text-center">
          <h1 className="text-xl font-semibold">This paper is no longer available</h1>
          <p className="mt-2 text-sm text-muted-foreground">It was removed after community reports. The file is no longer available.</p>
          <Link href="/" className="mt-6 inline-flex rounded-xl bg-primary px-5 py-2.5 text-sm text-primary-foreground">Go home</Link>
        </Container>
      );
    }
    const mod = await db.select().from(modules).where(eq(modules.id, paper.moduleId)).limit(1);
    moduleData = mod[0] ?? null;
    canonical = await getCanonicalFile(paper.id);
    if (!canonical) error = "File not yet available — processing.";
  } catch (e) {
    console.error("[paper page]", e);
    error = "Could not load paper — database not connected.";
  }

  if (!paper || !moduleData) {
    return (
      <Container className="py-8">
        <p className="text-sm text-muted-foreground">{error || "Paper not found."}</p>
      </Container>
    );
  }

  const displayType = paper.assessmentType === "SUPPLEMENTARY" ? "Supplementary" : paper.assessmentType.charAt(0) + paper.assessmentType.slice(1).toLowerCase();
  const displayNumber = paper.assessmentNumber ? ` ${paper.assessmentNumber}` : "";
  const title = `${moduleData.code} — ${paper.academicYear} Semester ${paper.semester} — ${displayType}${displayNumber}`;

  // Build viewer URL: for local dev via /api/files, for prod via signed R2 — we use download API that redirects, but viewer needs direct PDF bytes
  // We'll construct a viewer URL that points to /api/files for LocalStorage or signed URL for R2 — for MVP, use /api/files if available, else use download redirect
  // For now, if canonical exists, viewer URL is `/api/files/${encodeURIComponent(canonical.r2ObjectKey)}` for local, or we can use `/api/papers/${id}/view-file` — simpler to use files API
  const viewerUrl = canonical ? `/api/files/${encodeURIComponent(canonical.r2ObjectKey)}` : null;
  const downloadUrl = `/api/papers/${paper.id}/download`;

  return (
    <Container className="py-6">
      <ViewTracker paperId={paper.id} />
      <div className="text-sm text-muted-foreground">
        <Link href="/browse" className="hover:underline">Browse</Link> / <Link href={`/modules/${moduleData.code.toLowerCase()}`} className="hover:underline">{moduleData.code}</Link> / {paper.academicYear}
      </div>

      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{moduleData.code}</h1>
          <p className="text-sm text-muted-foreground">{moduleData.name}</p>
          <p className="mt-2 text-sm">
            <span className="font-medium">{paper.academicYear}</span> · Semester {paper.semester} · {displayType}
            {displayNumber}
          </p>
          <div className="mt-2 flex gap-2">
            <Badge variant="secondary">{paper.assessmentType}</Badge>
            {paper.assessmentNumber && <Badge variant="outline">#{paper.assessmentNumber}</Badge>}
            <Badge variant="outline">Year {paper.academicYear}</Badge>
          </div>
        </div>
        <div className="flex gap-2">
          {viewerUrl ? (
            <a href={downloadUrl} className="inline-flex items-center justify-center rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-slate-800 min-h-[44px]">
              Download
            </a>
          ) : (
            <span className="inline-flex items-center rounded-xl border px-5 py-2.5 text-sm text-muted-foreground">No file</span>
          )}
          <a href="#report" className="inline-flex items-center justify-center rounded-xl border bg-background px-5 py-2.5 text-sm font-medium hover:bg-accent min-h-[44px]">
            Report
          </a>
        </div>
      </div>

      <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
        <span>Views: {paper.views}</span>
        <span>Downloads: {paper.downloads}</span>
      </div>

      {viewerUrl ? (
        <div className="mt-6">
          <PDFViewer url={viewerUrl} title={title} />
        </div>
      ) : (
        <Card className="mt-6">
          <CardContent className="py-8 text-center text-sm text-muted-foreground">{error}</CardContent>
        </Card>
      )}

      <div id="report" className="mt-6">
        <ReportDialog paperId={paper.id} />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Download</CardTitle>
        </CardHeader>
        <CardContent>
          {viewerUrl ? (
            <a href={downloadUrl} className="text-sm font-medium hover:underline">
              Download {moduleData.code}_{paper.academicYear}_{displayType}
              {displayNumber ? `_${paper.assessmentNumber}` : ""}.pdf
            </a>
          ) : (
            <p className="text-sm text-muted-foreground">No file available.</p>
          )}
          <p className="mt-2 text-xs text-muted-foreground">Free, no account needed. File max 3 MB. Served from R2/CDN, not via server memory.</p>
        </CardContent>
      </Card>
    </Container>
  );
}
