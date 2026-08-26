import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/container";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function DeptPage({ params }: { params: Promise<{ facultySlug: string; deptSlug: string }> }) {
  const { facultySlug, deptSlug } = await params;
  try {
    const { getDb } = await import("@/lib/db");
    const { faculties } = await import("@/db/schema/faculties");
    const { departments } = await import("@/db/schema/departments");
    const { programmes } = await import("@/db/schema/programmes");
    const { eq } = await import("drizzle-orm");
    const db = getDb();

    const fac = await db.select().from(faculties).where(eq(faculties.slug, facultySlug.toLowerCase().trim())).limit(1);
    if (fac.length === 0) return notFound();
    const normalizedDept = deptSlug.toLowerCase().trim();
    const dept = await db.select().from(departments).where(eq(departments.slug, normalizedDept)).limit(1);
    if (dept.length === 0) return notFound();
    // Validate that department belongs to requested faculty (via school → faculty)
    try {
      const { schools } = await import("@/db/schema/schools");
      const sch = await db.select().from(schools).where(eq(schools.id, dept[0].schoolId)).limit(1);
      if (sch.length && sch[0].facultyId !== fac[0].id) {
        // Dept exists but under different faculty — show notFound to avoid leaking cross-faculty data
        // However still allow viewing dept if slug collides: we prefer to show correct faculty breadcrumb but not crash
        console.warn("[dept page] faculty mismatch", { facultySlug, deptSlug, expectedFaculty: fac[0].id, actual: sch[0].facultyId });
      }
    } catch {}

    const progs = await db.select().from(programmes).where(eq(programmes.departmentId, dept[0].id)).orderBy(programmes.code);

    return (
      <Container className="py-8">
        <div className="text-sm text-muted-foreground">
          <Link prefetch={false} href="/browse" className="hover:underline">
            Browse
          </Link>{" "}
          /{" "}
          <Link prefetch={false} href={`/browse/${facultySlug}`} className="hover:underline">
            {fac[0].code}
          </Link>{" "}
          / {dept[0].name}
        </div>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">{dept[0].name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{progs.length} Programmes</p>

        {progs.length === 0 ? (
          <Card className="mt-6">
            <CardContent className="py-8 text-center text-sm text-muted-foreground">No programmes found.</CardContent>
          </Card>
        ) : (
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {progs.map((p) => (
              <Link prefetch={false} key={p.id} href={`/browse/${facultySlug}/${deptSlug}/${p.code}`} className="group">
                <Card className="h-full hover:border-foreground/20 transition-colors">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <Badge variant="secondary">{p.code}</Badge>
                      <Badge variant={p.level === "bachelor" ? "default" : "outline"}>{p.level}</Badge>
                    </div>
                    <CardTitle className="text-sm leading-tight group-hover:underline">{p.name}</CardTitle>
                    <CardDescription className="text-xs">NQF {p.nqfLevel} · {p.nqfCredits} credits</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground">View modules →</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </Container>
    );
  } catch (e) {
    console.error("[dept page]", e);
    return (
      <Container className="py-8">
        <p className="text-sm text-muted-foreground">Could not load department.</p>
      </Container>
    );
  }
}
