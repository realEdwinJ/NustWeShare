"use client";

import { useEffect, useState } from "react";
import { formatDate, timeAgo } from "@/lib/papers/format";

/** Renders a stable absolute date on the server, then a relative time ("3 h ago") after mount. */
export function RelTime({ date, prefix = "" }: { date: Date | string | number; prefix?: string }) {
  const [rel, setRel] = useState<string | null>(null);
  useEffect(() => {
    setRel(timeAgo(date));
    const t = setInterval(() => setRel(timeAgo(date)), 60_000);
    return () => clearInterval(t);
  }, [date]);
  const d = new Date(date);
  return (
    <time dateTime={d.toISOString()} title={formatDate(d, { dateStyle: "medium", timeStyle: "short" } as Intl.DateTimeFormatOptions)} suppressHydrationWarning>
      {prefix}
      {rel ?? formatDate(d)}
    </time>
  );
}
