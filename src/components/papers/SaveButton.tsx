"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bookmark, BookmarkCheck, Bell, BellRing } from "lucide-react";
import { Button, type ButtonSize, type ButtonVariant } from "@/components/ui/button";
import { useSession } from "@/components/providers/session";
import { useToast } from "@/components/ui/toast";
import { guestSaved } from "@/lib/client/library";

export function SaveButton({
  paperId,
  moduleCode,
  initial = false,
  variant = "outline",
  size = "default",
  iconOnly,
}: {
  paperId?: string;
  moduleCode?: string;
  initial?: boolean;
  variant?: ButtonVariant;
  size?: ButtonSize;
  iconOnly?: boolean;
}) {
  const user = useSession();
  const router = useRouter();
  const { toast } = useToast();
  const [saved, setSaved] = useState(initial);
  const [busy, setBusy] = useState(false);
  const isModule = !!moduleCode;

  useEffect(() => {
    if (!user && paperId) setSaved(guestSaved.has(paperId));
  }, [user, paperId]);

  async function toggle() {
    if (!user) {
      if (paperId) {
        const now = guestSaved.toggle(paperId);
        setSaved(now);
        toast({
          tone: "success",
          title: now ? "Saved on this device" : "Removed from saved",
          description: now ? "Create a free profile to keep saved papers on every device." : undefined,
          action: now ? { label: "Create profile", onClick: () => router.push("/register") } : undefined,
        });
        return;
      }
      toast({ title: "Log in to follow modules", description: "Followed modules show up on your home page.", action: { label: "Log in", onClick: () => router.push("/login") } });
      return;
    }
    setBusy(true);
    const next = !saved;
    setSaved(next);
    try {
      const res = await fetch("/api/bookmarks", {
        method: next ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(paperId ? { paperId } : { moduleCode }),
      });
      if (!res.ok) throw new Error();
      toast({ tone: "success", title: isModule ? (next ? `Following ${moduleCode}` : `Unfollowed ${moduleCode}`) : next ? "Saved to your library" : "Removed from library" });
      router.refresh();
    } catch {
      setSaved(!next);
      toast({ tone: "error", title: "Couldn't update. Please try again." });
    } finally {
      setBusy(false);
    }
  }

  const Icon = isModule ? (saved ? BellRing : Bell) : saved ? BookmarkCheck : Bookmark;
  const label = isModule ? (saved ? "Following" : "Follow") : saved ? "Saved" : "Save";
  return (
    <Button variant={saved && !iconOnly ? "secondary" : variant} size={iconOnly ? (size === "sm" ? "icon-sm" : "icon") : size} onClick={toggle} disabled={busy} aria-pressed={saved} aria-label={iconOnly ? label : undefined} title={iconOnly ? label : undefined}>
      <Icon className={saved ? "text-info" : undefined} />
      {!iconOnly && label}
    </Button>
  );
}
