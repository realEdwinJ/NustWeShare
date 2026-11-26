"use client";

import { useEffect } from "react";
import { recentPapers } from "@/lib/client/library";

export function ViewTracker({ paperId, moduleCode, label }: { paperId: string; moduleCode: string; label: string }) {
  useEffect(() => {
    fetch(`/api/papers/${paperId}/view`, { method: "POST" }).catch(() => {});
    recentPapers.add({ id: paperId, moduleCode, label });
  }, [paperId, moduleCode, label]);
  return null;
}
