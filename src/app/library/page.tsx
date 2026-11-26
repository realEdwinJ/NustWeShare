import { desc, eq } from "drizzle-orm";
import { Container } from "@/components/ui/container";
import { PageHeader } from "@/components/ui/page-header";
import { getCurrentUser } from "@/lib/auth/current";
import { getDb } from "@/lib/db";
import { bookmarks } from "@/db/schema/bookmarks";
import { getFollowedModules, listPapersByIds } from "@/lib/papers/queries";
import { LibraryClient } from "./LibraryClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "My library", robots: { index: false } };

export default async function LibraryPage() {
  const user = await getCurrentUser();
  let saved: Awaited<ReturnType<typeof listPapersByIds>> = [];
  let followed: Awaited<ReturnType<typeof getFollowedModules>> = [];
  if (user) {
    const rows = await getDb().select({ paperId: bookmarks.paperId }).from(bookmarks).where(eq(bookmarks.userId, user.id)).orderBy(desc(bookmarks.createdAt));
    [saved, followed] = await Promise.all([listPapersByIds(rows.map((r) => r.paperId).filter(Boolean) as string[]), getFollowedModules(user.id)]);
  }
  return (
    <Container className="py-8 sm:py-10">
      <PageHeader title="My library" description="Saved papers, followed modules and your reading history." />
      <LibraryClient
        signedIn={!!user}
        saved={saved.map((p) => ({ ...p, createdAt: p.createdAt.toISOString() }))}
        followed={followed}
      />
    </Container>
  );
}
