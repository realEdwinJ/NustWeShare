import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/container";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function ProgrammeModulesPage({ params }: { params: Promise<{ facultySlug: string; deptSlug: string; programmeCode: string }> }) {
  const { facultySlug, deptSlug, programmeCode } = await params;
  const code = programmeCode.trim().toUpperCase();
  try {
    const { getDb } = await import("@/lib/db");
    const { programmes } = await import("@/db/schema/programmes");
    const { modules } = await import("@/db/schema/modules");
    const { programmeModules } = await import("@/db/schema/programme_modules");
    const { eq, asc } = await import("drizzle-orm");
    const db = getDb();

    const prog = await db.select().from(programmes).where(eq(programmes.code, code)).limit(1);
    if (prog.length === 0) return notFound();

    const rows = await db
      .select({ code: modules.code, name: modules.name, yearLevel: programmeModules.yearLevel, semester: programmeModules.semester })
      .from(programmeModules)
      .innerJoin(modules, eq(programmeModules.moduleId, modules.id))
      .where(eq(programmeModules.programmeId, prog[0].id))
      .orderBy(asc(programmeModules.yearLevel), asc(programmeModules.semester), asc(modules.code));

    // Group by yearLevel
    const byYear = new Map<number | string, typeof rows>();
    for (const r of rows) {
      const key = r.yearLevel ?? "Postgraduate";
      if (!byYear.has(key)) byYear.set(key, []);
      byYear.get(key)!.push(r);
    }

    return (
      <Container className="py-8">
        <div className="text-sm text-muted-foreground">
          <Link prefetch={false} href="/browse" className="hover:underline">
            Browse
          </Link>{" "}
          /{" "}
          <Link prefetch={false} href={`/browse/${facultySlug}`} className="hover:underline">
            {facultySlug.toUpperCase()}
          </Link>{" "}
          /{" "}
          <Link prefetch={false} href={`/browse/${facultySlug}/${deptSlug}`} className="hover:underline">
            {deptSlug}
          </Link>{" "}
          / {code}
        </div>
        <h1 className="mt-2 text-xl font-bold tracking-tight">{prog[0].name}</h1>
        <p className="text-sm text-muted-foreground">
          {prog[0].code} · NQF {prog[0].nqfLevel} · {rows.length} modules
        </p>

        {rows.length === 0 ? (
          <Card className="mt-6">
            <CardContent className="py-8 text-center text-sm text-muted-foreground">No modules found for this programme yet.</CardContent>
          </Card>
        ) : (
          <div className="mt-6 space-y-6">
            {[...byYear.entries()]
              .sort((a, b) => {
                if (a[0] === "Postgraduate") return 1;
                if (b[0] === "Postgraduate") return -1;
                return Number(a[0]) - Number(b[0]);
              })
              .map(([year, mods]) => (
                <Card key={String(year)}>
                  <CardHeader>
                    <CardTitle className="text-base">{year === "Postgraduate" ? "Postgraduate" : `Year ${year}`}</CardTitle>
                    <CardDescription>{mods.length} modules</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {mods.map((m) => (
                        <Link prefetch={false} key={m.code} href={`/modules/${m.code.toLowerCase()}`} className="group rounded-xl border px-3 py-3 hover:bg-accent">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-mono text-sm font-semibold">{m.code}</span>
                            {m.semester && <Badge variant="outline">Sem {m.semester}</Badge>}
                          </div>
                          <p className="mt-1 text-sm font-medium group-hover:underline line-clamp-2">{m.name}</p>
                        </Link>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        )}
      </Container>
    );
  } catch (e) {
    console.error("[programme modules]", e);
    return (
      <Container className="py-8">
        <p className="text-sm text-muted-foreground">Could not load modules.</p>
      </Container>
    );
  }
}
