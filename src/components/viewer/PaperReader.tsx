"use client";

import dynamic from "next/dynamic";
import { useSession } from "@/components/providers/session";

const PDFViewer = dynamic(() => import("./PDFViewer").then((m) => m.PDFViewer), {
  ssr: false,
  loading: () => <div className="skeleton h-[78vh] min-h-[480px] rounded-2xl sm:h-[82vh]" />,
});

export function PaperReader({ paperId, title }: { paperId: string; title: string }) {
  const user = useSession();
  const zoom = (user?.preferences?.viewerZoom as "fit-width" | "fit-page" | "100" | undefined) ?? "fit-width";
  const naming = user?.preferences?.downloadNaming === "original" ? "?name=original" : "";
  return <PDFViewer url={`/api/papers/${paperId}/file`} downloadUrl={`/api/papers/${paperId}/download${naming}`} title={title} docId={paperId} defaultZoom={zoom} />;
}
