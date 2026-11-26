import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq, inArray } from "drizzle-orm";
import { ArrowRight } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Breadcrumbs, PageHeader } from "@/components/ui/page-header";
import { getDb } from "@/lib/db";
import { faculties } from "@/db/schema/faculties";
import { schools } from "@/db/schema/schools";
import { departments } from "@/db/schema/departments";
import { programmes } from "@/db/schema/programmes";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ facultySlug: string }> }) {
  const { facultySlug } = await params;
  return { title: `${facultySlug.toUpperCase()} past papers` };
}

export default async function FacultyPage({ params }: { params: Promise<{ facultySlug: string }> }) {
  const { facultySlug } = await params;
  const db = getDb();
  const [fac] = await db.select().from(faculties).where(eq(faculties.slug, facultySlug.toLowerCase())).limit(1);
  if (!fac) notFound();
  const schs = await db.select().from(schools).where(eq(schools.facultyId, fac.id)).orderBy(asc(schools.name));
  const deps = schs.length ? await db.select().from(departments).where(inArray(departments.schoolId, schs.map((s) => s.id))).orderBy(asc(departments.name)) : [];
  const progs = deps.length ? await db.select({ departmentId: programmes.departmentId }).from(programmes).where(inArray(programmes.departmentId, deps.map((d) => d.id))) : [];
  const count = new Map<string, number>();
  for (const p of progs) count.set(p.departmentId, (count.get(p.departmentId) ?? 0) + 1);

  return (
    <Container className="py-8 sm:py-10">
      <Breadcrumbs items={[{ href: "/browse", label: "Browse" }, { label: fac.code }]} />
      <PageHeader className="mt-4" title={fac.name} description={`${schs.length} schools · ${deps.length} departments · ${progs.length} programmes`} />
      <div className="mt-8 space-y-6">
        {schs.map((s) => (
          <Card key={s.id}>
            <CardHeader className="pb-3">
              <CardTitle>{s.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {deps
                  .filter((d) => d.schoolId === s.id)
                  .map((d) => (
                    <Link key={d.id} href={`/browse/${fac.slug}/${d.slug}`} className="group flex items-center justify-between gap-3 rounded-xl border p-4 hover:border-input hover:bg-accent/40">
                      <span className="min-w-0">
                        <span className="block text-sm font-medium">{d.name}</span>
                        <span className="text-xs text-muted-foreground">{count.get(d.id) ?? 0} programmes</span>
                      </span>
                      <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  ))}
                {deps.filter((d) => d.schoolId === s.id).length === 0 && <Badge variant="outline">No departments listed yet</Badge>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </Container>
  );
}
