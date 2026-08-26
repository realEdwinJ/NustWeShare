import Link from "next/link";
import { Container } from "@/components/ui/container";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";
export const metadata = { title: "Browse" };

async function getFaculties() {
  try {
    const { getDb } = await import("@/lib/db");
    const { faculties } = await import("@/db/schema/faculties");
    const db = getDb();
    const rows = await db.select().from(faculties).orderBy(faculties.code);
    return rows;
  } catch (e) {
    console.error("[browse] db error", e);
    return null;
  }
}

async function getSchoolsForFaculty(slug: string, allSchools: Array<{ id: string; facultyId: string; name: string; code: string | null; slug: string }>, facultyIdMap: Map<string, string>) {
  try {
    const facultyId = facultyIdMap.get(slug);
    if (!facultyId) return [];
    return allSchools.filter((s) => s.facultyId === facultyId);
  } catch {
    return [];
  }
}

export default async function BrowsePage() {
  const faculties = await getFaculties();

  // Fallback if DB not available (e.g., build without DATABASE_URL)
  if (!faculties) {
    return (
      <Container className="py-8">
        <h1 className="text-2xl font-bold tracking-tight">Browse</h1>
        <p className="mt-1 text-sm text-muted-foreground">Faculty → School → Department → Programme → Module → Papers</p>
        <Card className="mt-6">
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Browse is temporarily unavailable — database not connected. Please check <code className="bg-muted px-1 rounded">DATABASE_URL</code> and run{" "}
            <code className="bg-muted px-1 rounded">npm run db:migrate && npm run db:seed</code>.
          </CardContent>
        </Card>
      </Container>
    );
  }

  // Fetch all schools once for efficient rendering (avoid N+1)
  let allSchools: Array<{ id: string; facultyId: string; name: string; code: string | null; slug: string }> = [];
  try {
    const { getDb } = await import("@/lib/db");
    const { schools } = await import("@/db/schema/schools");
    const db = getDb();
    allSchools = await db.select().from(schools);
  } catch {}

  const facultyIdMap = new Map(faculties.map((f) => [f.slug, f.id]));

  // For Stage 5, show faculties with school counts fetched lazily
  return (
    <Container className="py-8">
      <h1 className="text-2xl font-bold tracking-tight">Browse</h1>
      <p className="mt-1 text-sm text-muted-foreground">Faculty → School → Department → Programme → Module → Papers</p>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        {faculties.map((fac) => (
          <FacultyCard key={fac.id} faculty={fac} allSchools={allSchools} facultyIdMap={facultyIdMap} />
        ))}
      </div>

      <Card className="mt-6">
        <CardContent className="py-4 text-sm text-muted-foreground">
          Tip: Use search above to find a module instantly — try{" "}
          <Link href="/search?q=PLU411S" className="underline hover:text-foreground">
            PLU411S
          </Link>{" "}
          (canonical, appears in 10+ programmes, one row).
        </CardContent>
      </Card>

      <BrowseHierarchy faculties={faculties} />
    </Container>
  );
}

function FacultyCard({ faculty, allSchools, facultyIdMap }: { faculty: { id: string; code: string; name: string; slug: string }; allSchools: Array<{ id: string; facultyId: string; name: string; code: string | null; slug: string }>; facultyIdMap: Map<string, string> }) {
  const schools = allSchools.filter((s) => s.facultyId === facultyIdMap.get(faculty.slug));
  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>{faculty.code}</CardTitle>
            <CardDescription>{faculty.name}</CardDescription>
          </div>
          <Badge>{schools.length} Schools</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {schools.length === 0 ? (
          <p className="text-sm text-muted-foreground">No schools found.</p>
        ) : (
          <ul className="space-y-2">
            {schools.map((s) => (
              <li key={s.id} className="flex items-center justify-between rounded-xl border px-3 py-2">
                <span className="text-sm font-medium">{s.name}</span>
                <span className="text-xs text-muted-foreground">{s.code || ""}</span>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-4 flex gap-2">
          <Link href={`/browse/${faculty.slug}`} className="text-sm font-medium hover:underline">
            Explore {faculty.code} →
          </Link>
          <span className="text-muted-foreground text-sm">·</span>
          <Link href={`/search?q=${faculty.code}`} className="text-sm text-muted-foreground hover:text-foreground hover:underline">
            Search {faculty.code}
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

// Client-like hierarchy explorer — for Stage 5, show interactive browser that fetches departments/programmes/modules
// Simplified as server-rendered expandable list to avoid client fetch complexity for now
async function BrowseHierarchy({ faculties }: { faculties: { id: string; slug: string; code: string }[] }) {
  // Fetch departments for first faculty as preview
  try {
    const { getDb } = await import("@/lib/db");
    const { schools } = await import("@/db/schema/schools");
    const { departments } = await import("@/db/schema/departments");
    const { eq } = await import("drizzle-orm");
    const db = getDb();
    // Get one school per faculty to show preview departments
    const allSchools = await db.select().from(schools);
    const allDepts = await db.select().from(departments).orderBy(departments.name).limit(10);
    if (allDepts.length === 0) return null;
    return (
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Preview — Departments</CardTitle>
          <CardDescription>First 10 departments from DB — full hierarchy in Stage 5 explorer.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2">
            {allDepts.map((d) => (
              <Link key={d.id} href={`/search?q=${d.slug}`} className="rounded-xl border px-3 py-2 text-sm hover:bg-accent">
                {d.name}
              </Link>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Schools total: {allSchools.length} · Departments total: {allDepts.length} (DB counts)
          </p>
        </CardContent>
      </Card>
    );
  } catch {
    return null;
  }
}
