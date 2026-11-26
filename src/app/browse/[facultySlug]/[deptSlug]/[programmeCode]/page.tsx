import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { Container } from "@/components/ui/container";
import { Badge } from "@/components/ui/badge";
import { Breadcrumbs, PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { getDb } from "@/lib/db";
import { programmes } from "@/db/schema/programmes";
import { modules } from "@/db/schema/modules";
import { programmeModules } from "@/db/schema/programme_modules";
import { departments } from "@/db/schema/departments";
import { getPaperCountsForModules } from "@/lib/papers/queries";
import { ProgrammeModules } from "./ProgrammeModules";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ programmeCode: string }> }) {
  const { programmeCode } = await params;
  try {
    const [p] = await getDb().select({ name: programmes.name }).from(programmes).where(eq(programmes.code, programmeCode.toUpperCase())).limit(1);
    return { title: p ? `${p.name} — modules & past papers` : "Programme" };
  } catch {
    return { title: "Programme" };
  }
}

export default async function ProgrammePage({ params }: { params: Promise<{ facultySlug: string; deptSlug: string; programmeCode: string }> }) {
  const { facultySlug, deptSlug, programmeCode } = await params;
  const db = getDb();
  const [prog] = await db.select().from(programmes).where(eq(programmes.code, programmeCode.toUpperCase())).limit(1);
  if (!prog) notFound();
  const [dept] = await db.select().from(departments).where(eq(departments.id, prog.departmentId)).limit(1);
  const rows = await db
    .select({ id: modules.id, code: modules.code, name: modules.name, yearLevel: programmeModules.yearLevel, semester: programmeModules.semester, isCore: programmeModules.isCore })
    .from(programmeModules)
    .innerJoin(modules, eq(programmeModules.moduleId, modules.id))
    .where(eq(programmeModules.programmeId, prog.id))
    .orderBy(asc(programmeModules.yearLevel), asc(programmeModules.semester), asc(modules.code));
  const seen = new Set<string>();
  const unique = rows.filter((r) => (seen.has(r.code) ? false : (seen.add(r.code), true)));
  const counts = await getPaperCountsForModules(unique.map((r) => r.id));
  const list = unique.map((r) => ({ code: r.code, name: r.name, yearLevel: r.yearLevel, semester: r.semester, isCore: r.isCore, papers: counts.get(r.id) ?? 0 }));
  const withPapers = list.filter((m) => m.papers > 0).length;

  return (
    <Container className="py-8 sm:py-10">
      <Breadcrumbs
        items={[
          { href: "/browse", label: "Browse" },
          { href: `/browse/${facultySlug}`, label: facultySlug.toUpperCase() },
          { href: `/browse/${facultySlug}/${deptSlug}`, label: dept?.name ?? deptSlug },
          { label: prog.code },
        ]}
      />
      <PageHeader
        className="mt-4"
        eyebrow={
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="outline" className="font-mono">{prog.code}</Badge>
            <Badge variant="secondary" className="capitalize">{prog.level}</Badge>
            {prog.nqfLevel && <Badge variant="outline">NQF {prog.nqfLevel}</Badge>}
          </div>
        }
        title={prog.name}
        description={`${list.length} modules · ${withPapers} with past papers`}
      />
      <div className="mt-8">{list.length === 0 ? <EmptyState title="No modules listed for this programme yet" /> : <ProgrammeModules modules={list} />}</div>
      <p className="mt-8 text-sm text-muted-foreground">
        Tip: open a module and tap <span className="font-medium text-foreground">Follow</span> to get it on your home page.{" "}
        <Link href="/settings#study" className="text-info hover:underline">Set this as your programme</Link>
      </p>
    </Container>
  );
}
