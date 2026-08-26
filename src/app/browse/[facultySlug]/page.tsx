import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/container";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ facultySlug: string }> }) {
  const { facultySlug } = await params;
  return { title: `Browse ${facultySlug.toUpperCase()}` };
}

export default async function FacultyBrowsePage({ params }: { params: Promise<{ facultySlug: string }> }) {
  const { facultySlug } = await params;
  const normalized = facultySlug.toLowerCase();

  try {
    const { getDb } = await import("@/lib/db");
    const { faculties } = await import("@/db/schema/faculties");
    const { schools } = await import("@/db/schema/schools");
    const { departments } = await import("@/db/schema/departments");
    const { programmes } = await import("@/db/schema/programmes");
    const { eq } = await import("drizzle-orm");
    const db = getDb();

    const fac = await db.select().from(faculties).where(eq(faculties.slug, normalized)).limit(1);
    if (fac.length === 0) return notFound();
    const faculty = fac[0];

    const schs = await db.select().from(schools).where(eq(schools.facultyId, faculty.id)).orderBy(schools.name);
    // For each school, get departments
    const allDepts: Array<{ id: string; name: string; slug: string; schoolSlug: string }> = [];
    for (const s of schs) {
      const deps = await db.select().from(departments).where(eq(departments.schoolId, s.id)).orderBy(departments.name);
      for (const d of deps) allDepts.push({ ...d, schoolSlug: s.slug });
    }

    // For each dept, get programmes count
    const progRows = await db.select().from(programmes);
    const progByDept = new Map<string, number>();
    for (const p of progRows) progByDept.set(p.departmentId, (progByDept.get(p.departmentId) || 0) + 1);

    return (
      <Container className="py-8">
        <div className="text-sm text-muted-foreground">
          <Link href="/browse" className="hover:text-foreground hover:underline">
            Browse
          </Link>{" "}
          / {faculty.code}
        </div>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">{faculty.code} — {faculty.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{schs.length} Schools · {allDepts.length} Departments</p>

        {schs.length === 0 ? (
          <Card className="mt-6">
            <CardContent className="py-10 text-center">
              <p className="text-sm font-medium">No schools found for {faculty.code} yet.</p>
              <p className="text-sm text-muted-foreground mt-1">Academic data is being updated — check back soon or try search.</p>
              <Link href="/search" className="mt-4 inline-flex rounded-xl border px-4 py-2 text-sm hover:bg-accent">Search modules</Link>
            </CardContent>
          </Card>
        ) : (
          <div className="mt-6 space-y-6">
            {schs.map((school) => {
              const deps = allDepts.filter((d) => d.schoolSlug === school.slug);
              return (
                <Card key={school.id}>
                  <CardHeader>
                    <CardTitle className="text-base">{school.name}</CardTitle>
                    <CardDescription>{deps.length} Departments{deps.length === 0 ? " — no departments yet" : ""}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {deps.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-4 text-center">No departments yet for this school.</p>
                    ) : (
                      <div className="grid gap-3 sm:grid-cols-2">
                        {deps.map((dept) => (
                          <Link key={dept.id} href={`/browse/${faculty.slug}/${dept.slug}`} className="group rounded-xl border p-4 hover:border-foreground/20 transition-colors">
                            <div className="flex items-start justify-between gap-2">
                              <span className="text-sm font-medium group-hover:underline">{dept.name}</span>
                              <Badge variant="outline">{progByDept.get(dept.id) || 0} programmes</Badge>
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">View programmes →</p>
                          </Link>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <div className="mt-6 flex gap-3">
          <Link href="/browse" className="text-sm font-medium hover:underline">
            ← Back to faculties
          </Link>
          <Link href={`/search?q=${faculty.code}`} className="text-sm text-muted-foreground hover:text-foreground hover:underline">
            Search {faculty.code}
          </Link>
        </div>
      </Container>
    );
  } catch (e) {
    console.error("[browse faculty]", e);
    return (
      <Container className="py-8">
        <p className="text-sm text-muted-foreground">Could not load faculty — database not connected.</p>
        <Link href="/browse" className="text-sm underline">
          Back
        </Link>
      </Container>
    );
  }
}
