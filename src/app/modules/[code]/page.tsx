import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/container";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return { title: `${code.toUpperCase()} | NustWeShare` };
}

export default async function ModulePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const normalized = code.toUpperCase();

  try {
    const { getDb } = await import("@/lib/db");
    const { modules } = await import("@/db/schema/modules");
    const { programmeModules } = await import("@/db/schema/programme_modules");
    const { programmes } = await import("@/db/schema/programmes");
    const { departments } = await import("@/db/schema/departments");
    const { papers } = await import("@/db/schema/papers");
    const { eq, desc } = await import("drizzle-orm");
    const db = getDb();

    const mod = await db.select().from(modules).where(eq(modules.code, normalized)).limit(1);
    if (mod.length === 0) return notFound();
    const m = mod[0];

    // Programmes that use this module — proves canonical dedup
    const links = await db
      .select({ code: programmes.code, name: programmes.name, yearLevel: programmeModules.yearLevel, semester: programmeModules.semester })
      .from(programmeModules)
      .innerJoin(programmes, eq(programmeModules.programmeId, programmes.id))
      .where(eq(programmeModules.moduleId, m.id))
      .orderBy(programmes.code);

    let dept: { name: string; slug: string } | null = null;
    if (m.departmentId) {
      const d = await db.select().from(departments).where(eq(departments.id, m.departmentId)).limit(1);
      if (d.length) dept = { name: d[0].name, slug: d[0].slug };
    }

    // Papers for this module (stage 7 will populate)
    let papersByYear: Map<number, typeof papers.$inferSelect[]> | null = null;
    try {
      const pap = await db.select().from(papers).where(eq(papers.moduleId, m.id)).orderBy(desc(papers.academicYear));
      papersByYear = new Map();
      for (const p of pap) {
        if (!papersByYear.has(p.academicYear)) papersByYear.set(p.academicYear, []);
        papersByYear.get(p.academicYear)!.push(p);
      }
    } catch {
      // papers table may be empty
    }

    return (
      <Container className="py-8">
        <div className="text-sm text-muted-foreground">
          <Link href="/browse" className="hover:underline">
            Browse
          </Link>{" "}
          / {m.code}
        </div>

        <div className="mt-3">
          <h1 className="text-3xl font-bold tracking-tight font-mono">{m.code}</h1>
          <p className="mt-1 text-lg text-foreground">{m.name}</p>
          {dept && <p className="mt-1 text-sm text-muted-foreground">{dept.name}</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge>{links.length} {links.length === 1 ? "programme" : "programmes"} use this module</Badge>
            <Badge variant="outline">Canonical — one row, many programmes</Badge>
          </div>
        </div>

        {/* Programmes that use this module — proves dedup */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">Programmes that include {m.code}</CardTitle>
            <CardDescription>Same module, many courses — courses are just filters to find it easier.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2">
              {links.map((l) => (
                <Link key={l.code} href={`/browse/${l.code}`} className="rounded-xl border px-3 py-2 text-sm hover:bg-accent">
                  <span className="font-mono font-semibold">{l.code}</span> — <span className="text-muted-foreground">{l.name.slice(0, 50)}</span>
                  {l.yearLevel && <Badge variant="outline" className="ml-2">Year {l.yearLevel} Sem {l.semester}</Badge>}
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Papers — empty until Stage 7, but structure ready */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">Available Papers</CardTitle>
            <CardDescription>Grouped by year — Test 1 / Test 2 / Exam / Supplementary / Quiz / Assignment / Lab / Tutorial</CardDescription>
          </CardHeader>
          <CardContent>
            {!papersByYear || papersByYear.size === 0 ? (
              <div className="py-6 text-center">
                <p className="text-sm text-muted-foreground">No papers yet for this module — be the first to share.</p>
                <p className="mt-1 text-xs text-muted-foreground">Every paper helps the next NUST student.</p>
                <Link href="/upload" className="mt-4 inline-flex items-center justify-center rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-slate-800 min-h-[44px]">
                  Upload for {m.code}
                </Link>
                <div className="mt-6 grid gap-2 text-left sm:grid-cols-2">
                  {[2026, 2025, 2024].map((y) => (
                    <div key={y} className="rounded-xl border p-3">
                      <p className="text-sm font-semibold">{y}</p>
                      <p className="mt-1 text-xs text-muted-foreground">Test 1 · Test 2 · Exam · Supplementary</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {[...papersByYear.entries()]
                  .sort((a, b) => b[0] - a[0])
                  .map(([year, list]) => (
                    <div key={year} className="rounded-xl border p-3">
                      <p className="text-sm font-semibold">{year}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {list.map((p) => (
                          <Link key={p.id} href={`/papers/${p.id}`}>
                            <Badge variant="secondary" className="hover:bg-secondary/80">
                              {p.assessmentType} {p.assessmentNumber ? ` ${p.assessmentNumber}` : ""} · Sem {p.semester} →
                            </Badge>
                          </Link>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="mt-6 flex gap-3 text-sm">
          <Link href="/browse" className="hover:underline">
            ← Browse
          </Link>
          <Link href={`/search?q=${m.code}`} className="text-muted-foreground hover:text-foreground hover:underline">
            Search {m.code}
          </Link>
        </div>
      </Container>
    );
  } catch (e) {
    console.error("[module page]", e);
    return (
      <Container className="py-8">
        <p className="text-sm text-muted-foreground">Could not load module — database not connected.</p>
      </Container>
    );
  }
}
