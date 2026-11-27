import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { Download, Eye, FileText, GraduationCap, Upload } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Breadcrumbs } from "@/components/ui/page-header";
import { ModulePapers, type ModulePaper } from "@/components/papers/ModulePapers";
import { PaperRequests } from "@/components/papers/PaperRequests";
import { SaveButton } from "@/components/papers/SaveButton";
import { ShareButton } from "@/components/papers/ShareButton";
import { getModuleByCode, getModuleProgrammes, listModulePapers } from "@/lib/papers/queries";
import { compactNumber } from "@/lib/papers/format";
import { getCurrentUser } from "@/lib/auth/current";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  try {
    const m = await getModuleByCode(code);
    if (!m) return { title: "Module not found" };
    return {
      title: `${m.code} ${m.name} past papers`,
      description: `Read and download ${m.code} (${m.name}) past exam papers, tests and supplementaries from NUST — free, shared by students.`,
      alternates: { canonical: `/modules/${m.code.toLowerCase()}` },
    };
  } catch {
    return { title: `${code.toUpperCase()} past papers` };
  }
}

export default async function ModulePage({ params, searchParams }: { params: Promise<{ code: string }>; searchParams: Promise<{ year?: string; type?: string; sem?: string }> }) {
  const { code } = await params;
  const sp = await searchParams;
  if (!/^[a-z0-9]{2,20}$/i.test(code)) notFound();
  const m = await getModuleByCode(code);
  if (!m) notFound();

  const [papers, programmes, user] = await Promise.all([listModulePapers(m.id), getModuleProgrammes(m.id), getCurrentUser()]);

  let following = false;
  let savedIds: string[] = [];
  if (user) {
    const { getDb } = await import("@/lib/db");
    const { bookmarks } = await import("@/db/schema/bookmarks");
    const db = getDb();
    const rows = await db.select({ paperId: bookmarks.paperId, moduleId: bookmarks.moduleId }).from(bookmarks).where(eq(bookmarks.userId, user.id));
    following = rows.some((r) => r.moduleId === m.id);
    savedIds = rows.filter((r) => r.paperId).map((r) => r.paperId!);
  }

  const years = new Set(papers.map((p) => p.academicYear));
  const totalDownloads = papers.reduce((s, p) => s + p.downloads, 0);
  const totalViews = papers.reduce((s, p) => s + p.views, 0);
  const serialized: ModulePaper[] = papers.map((p) => ({
    id: p.id,
    academicYear: p.academicYear,
    semester: p.semester,
    assessmentType: p.assessmentType,
    assessmentNumber: p.assessmentNumber,
    views: p.views,
    downloads: p.downloads,
    fileSize: p.fileSize,
    pageCount: p.pageCount,
    hasFile: p.hasFile,
    createdAt: p.createdAt.toISOString(),
    uploader: p.uploader ? { username: p.uploader.username, displayName: p.uploader.displayName } : null,
  }));

  const crumbs = [{ href: "/browse", label: "Browse" }];
  if (m.facultySlug && m.facultyCode) crumbs.push({ href: `/browse/${m.facultySlug}`, label: m.facultyCode });
  if (m.facultySlug && m.departmentSlug && m.departmentName) crumbs.push({ href: `/browse/${m.facultySlug}/${m.departmentSlug}`, label: m.departmentName });

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Course",
    courseCode: m.code,
    name: m.name,
    provider: { "@type": "CollegeOrUniversity", name: "Namibia University of Science and Technology" },
  };

  return (
    <Container className="py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Breadcrumbs items={[...crumbs, { label: m.code }]} />

      <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-mono text-3xl font-bold tracking-tight sm:text-4xl">{m.code}</h1>
            {papers.length > 0 ? <Badge variant="success">{papers.length} paper{papers.length === 1 ? "" : "s"}</Badge> : <Badge variant="outline">No papers yet</Badge>}
          </div>
          <p className="mt-1.5 text-lg text-foreground/90">{m.name}</p>
          {m.departmentName && <p className="mt-0.5 text-sm text-muted-foreground">{m.departmentName}{m.schoolName ? ` · ${m.schoolName}` : ""}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          <SaveButton moduleCode={m.code} initial={following} />
          <ShareButton title={`${m.code} past papers`} text={`${m.code} ${m.name} past papers on NustWeShare`} />
          <Link href={`/upload?module=${m.code}`} className={buttonVariants({ variant: "brand" })}>
            <Upload /> Upload
          </Link>
        </div>
      </div>

      {papers.length > 0 && (
        <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { k: "Papers", v: papers.length, icon: FileText },
            { k: "Years covered", v: years.size, icon: GraduationCap },
            { k: "Reads", v: totalViews, icon: Eye },
            { k: "Downloads", v: totalDownloads, icon: Download },
          ].map((s) => (
            <div key={s.k} className="rounded-xl border bg-card px-4 py-3">
              <dt className="flex items-center gap-1.5 text-xs text-muted-foreground"><s.icon className="size-3.5" /> {s.k}</dt>
              <dd className="mt-0.5 text-xl font-semibold tabular-nums">{compactNumber(s.v)}</dd>
            </div>
          ))}
        </dl>
      )}

      <section className="mt-8" aria-labelledby="papers-h">
        <h2 id="papers-h" className="sr-only">Papers</h2>
        <ModulePapers
          moduleCode={m.code}
          moduleName={m.name}
          papers={serialized}
          savedIds={savedIds}
          initialFilters={{
            year: sp.year && /^\d{4}$/.test(sp.year) ? sp.year : undefined,
            type: sp.type && /^[A-Z]+$/.test(sp.type) ? sp.type : undefined,
            sem: sp.sem === "1" || sp.sem === "2" ? sp.sem : undefined,
          }}
        />
      </section>

      <div className="mt-10 grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <PaperRequests moduleCode={m.code} />
        </div>
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <GraduationCap className="size-4 text-info" /> Taught in {programmes.length} programme{programmes.length === 1 ? "" : "s"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {programmes.length === 0 ? (
              <p className="text-sm text-muted-foreground">Not linked to a programme yet.</p>
            ) : (
              <ul className="max-h-80 space-y-1 overflow-y-auto pr-1">
                {programmes.map((p) => (
                  <li key={p.code}>
                    <Link href={`/browse/${p.facultySlug}/${p.deptSlug}/${p.code.toLowerCase()}`} className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-accent">
                      <span className="min-w-0 truncate">
                        <span className="mr-1.5 font-mono text-xs text-muted-foreground">{p.code}</span>
                        {p.name}
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {p.yearLevel ? `Y${p.yearLevel}` : ""}
                        {p.semester ? ` S${p.semester}` : ""}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </Container>
  );
}
