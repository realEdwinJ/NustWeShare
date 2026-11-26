import { redirect } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { Container } from "@/components/ui/container";
import { PageHeader } from "@/components/ui/page-header";
import { getCurrentUser } from "@/lib/auth/current";
import { getDb } from "@/lib/db";
import { programmes } from "@/db/schema/programmes";
import { SettingsClient } from "./SettingsClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Settings", robots: { index: false } };

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/settings");
  const db = getDb();
  const progs = await db.select({ id: programmes.id, code: programmes.code, name: programmes.name }).from(programmes).where(eq(programmes.active, true)).orderBy(asc(programmes.name));
  const current = progs.find((p) => p.id === user.programmeId);
  const seen = new Set<string>();
  return (
    <Container className="py-8 sm:py-10">
      <PageHeader title="Settings" description="Your profile, preferences, privacy and security." />
      <SettingsClient
        user={{
          username: user.username,
          displayName: user.displayName,
          bio: user.bio ?? "",
          avatarColor: user.avatarColor,
          avatarEmoji: user.avatarEmoji ?? "",
          programmeCode: current?.code ?? "",
          studyYear: user.studyYear ?? null,
          publicProfile: user.publicProfile,
          showOnLeaderboard: user.showOnLeaderboard,
          uploadAnonymously: user.uploadAnonymously,
          preferences: user.preferences ?? {},
          lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
          pinChangedAt: user.pinChangedAt?.toISOString() ?? null,
          createdAt: user.createdAt.toISOString(),
        }}
        programmes={progs.filter((p) => (seen.has(p.code) ? false : (seen.add(p.code), true))).map((p) => ({ code: p.code, name: p.name }))}
      />
    </Container>
  );
}
