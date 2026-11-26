import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { CalendarDays, Download, Eye, FileText, GraduationCap, Lock, Trophy } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { PaperTile } from "@/components/papers/PaperListItem";
import { getDb } from "@/lib/db";
import { users } from "@/db/schema/users";
import { programmes } from "@/db/schema/programmes";
import { getLeaderboard, listUserUploads } from "@/lib/papers/queries";
import { compactNumber, formatDate } from "@/lib/papers/format";
import { getCurrentUser } from "@/lib/auth/current";

export const dynamic = "force-dynamic";

async function load(username: string) {
  if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) return null;
  const db = getDb();
  const [u] = await db.select().from(users).where(eq(users.normalizedUsername, username.toLowerCase())).limit(1);
  return u ?? null;
}

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const u = await load(username).catch(() => null);
  if (!u) return { title: "Profile not found", robots: { index: false } };
  if (!u.publicProfile) return { title: "Private profile", robots: { index: false } };
  return { title: `${u.displayName} (@${u.username})`, description: `Past papers shared by ${u.displayName} on NustWeShare.` };
}

export default async function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const u = await load(username);
  if (!u) notFound();
  const viewer = await getCurrentUser();
  const isMe = viewer?.id === u.id;

  if (!u.publicProfile && !isMe) {
    return (
      <Container className="py-16">
        <EmptyState icon={<Lock />} title="This profile is private" description="They've chosen to keep their profile hidden." />
      </Container>
    );
  }

  const [uploads, lb, prog] = await Promise.all([
    listUserUploads(u.id, { includeHidden: false }),
    u.showOnLeaderboard ? getLeaderboard({ limit: 500 }) : Promise.resolve({ rows: [], anonymousPapers: 0 }),
    u.programmeId ? getDb().select({ name: programmes.name, code: programmes.code }).from(programmes).where(eq(programmes.id, u.programmeId)).limit(1) : Promise.resolve([]),
  ]);
  const rank = lb.rows.find((r) => r.username === u.username)?.rank;
  const modules = [...new Set(uploads.map((x) => x.moduleCode))];

  return (
    <Container className="py-8 sm:py-10">
      <div className="flex flex-col gap-6 rounded-3xl border bg-card p-6 sm:flex-row sm:items-center sm:p-8">
        <Avatar name={u.displayName} color={u.avatarColor} emoji={u.avatarEmoji} size="xl" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">{u.displayName}</h1>
            {u.role === "admin" && <Badge variant="info">Moderator</Badge>}
            {rank && rank <= 10 && <Badge variant="brand"><Trophy /> Top {rank <= 3 ? 3 : 10}</Badge>}
            {!u.publicProfile && <Badge variant="outline"><Lock /> Only you can see this</Badge>}
          </div>
          <p className="text-sm text-muted-foreground">@{u.username}</p>
          {u.bio && <p className="mt-3 max-w-2xl text-sm leading-relaxed">{u.bio}</p>}
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {prog[0] && <span className="inline-flex items-center gap-1.5"><GraduationCap className="size-4" /> {prog[0].name}{u.studyYear ? ` · Year ${u.studyYear}` : ""}</span>}
            <span className="inline-flex items-center gap-1.5"><CalendarDays className="size-4" /> Joined {formatDate(u.createdAt, { month: "short", year: "numeric" })}</span>
          </div>
        </div>
        {isMe && <Link href="/settings" className={buttonVariants({ variant: "outline" })}>Edit profile</Link>}
      </div>

      <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { k: "Papers shared", v: uploads.length, icon: FileText },
          { k: "Modules helped", v: modules.length, icon: GraduationCap },
          { k: "Reads", v: uploads.reduce((s, x) => s + x.views, 0), icon: Eye },
          { k: "Downloads", v: uploads.reduce((s, x) => s + x.downloads, 0), icon: Download },
        ].map((s) => (
          <div key={s.k} className="rounded-2xl border bg-card p-4">
            <dt className="flex items-center gap-1.5 text-xs text-muted-foreground"><s.icon className="size-3.5" /> {s.k}</dt>
            <dd className="mt-1 text-2xl font-bold tabular-nums">{compactNumber(s.v)}</dd>
          </div>
        ))}
      </dl>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Shared papers</h2>
        <div className="mt-4">
          {uploads.length === 0 ? (
            <EmptyState icon={<FileText />} title="No public uploads yet" />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {uploads.slice(0, 60).map((p) => <PaperTile key={p.fileId} p={p} />)}
            </div>
          )}
        </div>
      </section>
    </Container>
  );
}
