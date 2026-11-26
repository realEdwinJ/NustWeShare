import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { Container } from "@/components/ui/container";
import { Badge } from "@/components/ui/badge";
import { Breadcrumbs, PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { getDb } from "@/lib/db";
import { faculties } from "@/db/schema/faculties";
import { schools } from "@/db/schema/schools";
import { departments } from "@/db/schema/departments";
import { programmes } from "@/db/schema/programmes";

export const dynamic = "force-dynamic";

const LEVEL_ORDER = ["certificate", "diploma", "bachelor", "honours", "master", "doctorate", "other"];

export default async function DeptPage({ params }: { params: Promise<{ facultySlug: string; deptSlug: string }> }) {
  const { facultySlug, deptSlug } = await params;
  const db = getDb();
  const rows = await db
    .select({ dept: departments, fac: faculties })
    .from(departments)
    .innerJoin(schools, eq(departments.schoolId, schools.id))
    .innerJoin(faculties, eq(schools.facultyId, faculties.id))
    .where(and(eq(departments.slug, deptSlug.toLowerCase()), eq(faculties.slug, facultySlug.toLowerCase())))
    .limit(1);
  if (!rows[0]) notFound();
  const { dept, fac } = rows[0];
  const progs = await db.select().from(programmes).where(eq(programmes.departmentId, dept.id)).orderBy(asc(programmes.name));
  const groups = LEVEL_ORDER.map((lvl) => ({ lvl, list: progs.filter((p) => p.level === lvl) })).filter((g) => g.list.length);

  return (
    <Container className="py-8 sm:py-10">
      <Breadcrumbs items={[{ href: "/browse", label: "Browse" }, { href: `/browse/${fac.slug}`, label: fac.code }, { label: dept.name }]} />
      <PageHeader className="mt-4" title={dept.name} description={`${progs.length} programmes`} />
      {progs.length === 0 ? (
        <EmptyState className="mt-8" title="No programmes listed yet" />
      ) : (
        <div className="mt-8 space-y-8">
          {groups.map((g) => (
            <section key={g.lvl}>
              <h2 className="mb-3 text-sm font-semibold capitalize text-muted-foreground">{g.lvl === "master" ? "Masters" : g.lvl === "doctorate" ? "Doctoral" : `${g.lvl}s`}</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {g.list.map((p) => (
                  <Link key={p.id} href={`/browse/${fac.slug}/${dept.slug}/${p.code.toLowerCase()}`} className="group rounded-xl border bg-card p-4 hover:border-input hover:shadow-[var(--shadow-soft)]">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs text-muted-foreground">{p.code}</span>
                      {p.nqfLevel && <Badge variant="outline">NQF {p.nqfLevel}</Badge>}
                    </div>
                    <p className="mt-2 text-sm font-medium leading-snug group-hover:underline">{p.name}</p>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </Container>
  );
}
