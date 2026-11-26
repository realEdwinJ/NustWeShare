import Link from "next/link";
import { ArrowRight, Building2 } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { SearchBar } from "@/components/search/SearchBar";
import { getFacultiesWithCounts } from "@/lib/papers/queries";
import { getDb } from "@/lib/db";
import { schools } from "@/db/schema/schools";
import { departments } from "@/db/schema/departments";
import { asc } from "drizzle-orm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Browse faculties", description: "Browse NUST past papers by faculty, school, department and programme." };

export default async function BrowsePage() {
  const [faculties, allSchools, allDepts] = await Promise.all([
    getFacultiesWithCounts(),
    getDb().select().from(schools).orderBy(asc(schools.name)),
    getDb().select().from(departments).orderBy(asc(departments.name)),
  ]);

  return (
    <Container className="py-8 sm:py-10">
      <PageHeader title="Browse" description="Faculty → department → programme → module. Or just search if you know the code." />
      <div className="mt-6 max-w-2xl">
        <SearchBar placeholder="Jump straight to a module…" />
      </div>
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {faculties.map((f) => {
          const sch = allSchools.filter((s) => s.facultyId === f.id);
          return (
            <Card key={f.id} className="overflow-hidden">
              <Link href={`/browse/${f.slug}`} className="group flex items-start gap-4 border-b p-6 hover:bg-accent/50">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-info-soft text-info">
                  <Building2 className="size-6" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-lg font-semibold">{f.code}</span>
                  <span className="block text-sm text-muted-foreground">{f.name}</span>
                  <span className="mt-2 block text-xs text-muted-foreground">
                    {f.programmes} programmes · <span className="font-medium text-foreground">{f.papers} papers</span>
                  </span>
                </span>
                <ArrowRight className="size-5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </Link>
              <div className="divide-y">
                {sch.map((s) => (
                  <div key={s.id} className="px-6 py-4">
                    <p className="text-sm font-medium">{s.name}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {allDepts
                        .filter((d) => d.schoolId === s.id)
                        .map((d) => (
                          <Link key={d.id} href={`/browse/${f.slug}/${d.slug}`} className="rounded-lg border bg-surface px-2.5 py-1 text-xs hover:border-input hover:bg-accent">
                            {d.name.replace(/^Department of /, "")}
                          </Link>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          );
        })}
      </div>
    </Container>
  );
}
