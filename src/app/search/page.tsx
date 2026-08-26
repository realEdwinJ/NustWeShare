import Link from "next/link";
import { Container } from "@/components/ui/container";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SearchBar } from "@/components/search/SearchBar";

export const dynamic = "force-dynamic";
export const metadata = { title: "Search" };

async function search(q: string) {
  try {
    const { getDb } = await import("@/lib/db");
    const { modules } = await import("@/db/schema/modules");
    const { programmes } = await import("@/db/schema/programmes");
    const { sql } = await import("drizzle-orm");
    const db = getDb();
    const like = `%${q}%`;
    const prefixLike = `${q}%`;
    const mods = await db
      .select()
      .from(modules)
      .where(sql`${modules.code} ILIKE ${like} OR ${modules.name} ILIKE ${like}`)
      .orderBy(modules.code)
      .limit(20);
    const progs = await db
      .select()
      .from(programmes)
      .where(sql`${programmes.code} ILIKE ${like} OR ${programmes.name} ILIKE ${like}`)
      .orderBy(programmes.code)
      .limit(10);
    return { modules: mods, programmes: progs };
  } catch (e) {
    console.error("[search page]", e);
    return null;
  }
}

function highlight(text: string, q: string) {
  if (!q) return text;
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-yellow-100 rounded px-0.5">{text.slice(idx, idx + q.length)}</mark>
      {text.slice(idx + q.length)}
    </>
  );
}

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const trimmed = q?.trim() ?? "";
  const data = trimmed ? await search(trimmed) : null;

  return (
    <Container className="py-8">
      <h1 className="text-2xl font-bold tracking-tight">Search</h1>
      <p className="mt-1 text-sm text-muted-foreground">Module code, module name, or programme — partial matches like ELC, Electronic, 511S all work.</p>
      <div className="mt-6 max-w-2xl">
        <SearchBar placeholder="Search modules — e.g. MCI511S" />
      </div>

      {!trimmed ? (
        <Card className="mt-6">
          <CardContent className="py-10 text-center">
            <p className="text-sm text-muted-foreground">Try: <Link href="/search?q=MCI511S" className="underline hover:text-foreground">MCI511S</Link> · <Link href="/search?q=PLU411S" className="underline">PLU411S</Link> · <Link href="/search?q=COA511S" className="underline">COA511S</Link></p>
            <p className="mt-2 text-xs text-muted-foreground">Tip: type at least 2 characters — results update instantly in the dropdown.</p>
          </CardContent>
        </Card>
      ) : data === null ? (
        <Card className="mt-6">
          <CardContent className="py-8 text-center text-sm text-muted-foreground">Search unavailable — database not connected.</CardContent>
        </Card>
      ) : data.modules.length === 0 && data.programmes.length === 0 ? (
        <Card className="mt-6">
          <CardContent className="py-10 text-center">
            <p className="text-sm">
              No results for <span className="font-mono font-semibold">&quot;{trimmed}&quot;</span>
            </p>
            <p className="mt-2 text-sm text-muted-foreground">Try a module code like MCI511S or a name like Mathematics.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="mt-6 space-y-6">
          {data.modules.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Modules ({data.modules.length})</CardTitle>
                <CardDescription>Canonical — one row per code, linked to many programmes.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2">
                  {data.modules.map((m) => (
                    <Link key={m.code} href={`/modules/${m.code.toLowerCase()}`} className="group rounded-xl border p-4 hover:bg-accent">
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-mono text-sm font-semibold">{highlight(m.code, trimmed)}</span>
                        <Badge variant="outline">Module</Badge>
                      </div>
                      <p className="mt-1 text-sm font-medium group-hover:underline">{highlight(m.name, trimmed)}</p>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
          {data.programmes.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Programmes ({data.programmes.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {data.programmes.map((p) => (
                    <Link key={p.code} href={`/search?q=${encodeURIComponent(p.code)}`} className="flex items-center justify-between rounded-xl border px-3 py-3 hover:bg-accent">
                      <span>
                        <span className="font-mono text-xs font-semibold">{highlight(p.code, trimmed)}</span>
                        <span className="ml-2 text-sm">{highlight(p.name, trimmed)}</span>
                      </span>
                      <Badge variant="secondary">{p.level}</Badge>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </Container>
  );
}
