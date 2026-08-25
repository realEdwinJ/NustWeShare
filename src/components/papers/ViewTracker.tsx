"use client";

import { useEffect } from "react";

export function ViewTracker({ paperId }: { paperId: string }) {
  useEffect(() => {
    fetch(`/api/papers/${paperId}/view`, { method: "POST" }).catch(() => {});
  }, [paperId]);
  return null;
}
