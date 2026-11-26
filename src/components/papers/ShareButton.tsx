"use client";

import { Share2 } from "lucide-react";
import { Button, type ButtonSize, type ButtonVariant } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

export function ShareButton({ title, text, path, variant = "outline", size = "default", iconOnly }: { title: string; text?: string; path?: string; variant?: ButtonVariant; size?: ButtonSize; iconOnly?: boolean }) {
  const { toast } = useToast();
  async function share() {
    const url = path ? new URL(path, location.origin).toString() : location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch (e: any) {
        if (e?.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      toast({ tone: "success", title: "Link copied", description: "Paste it in your class group chat." });
    } catch {
      toast({ tone: "error", title: "Couldn't copy the link" });
    }
  }
  return (
    <Button variant={variant} size={iconOnly ? (size === "sm" ? "icon-sm" : "icon") : size} onClick={share} aria-label={iconOnly ? "Share" : undefined} title={iconOnly ? "Share" : undefined}>
      <Share2 />
      {!iconOnly && "Share"}
    </Button>
  );
}
