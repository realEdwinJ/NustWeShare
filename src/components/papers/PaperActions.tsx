"use client";

import { useState } from "react";
import { Download, Flag, MoreHorizontal, Pencil, Share2 } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Dropdown, DropdownItem } from "@/components/ui/dropdown";
import { useToast } from "@/components/ui/toast";
import { SaveButton } from "./SaveButton";
import { ShareButton } from "./ShareButton";
import { EditPaperDialog } from "./EditPaperDialog";
import { ReportDialog } from "@/components/report/ReportDialog";

type P = { id: string; moduleCode: string; academicYear: number; semester: number; assessmentType: string; assessmentNumber: number | null };

/** Paper header actions: full row on ≥sm, Download + Save + "More" menu on phones. */
export function PaperActions({ paper, title, shareText, downloadUrl, filename, saved, canEdit, hasFile }: { paper: P; title: string; shareText: string; downloadUrl: string; filename: string; saved: boolean; canEdit: boolean; hasFile: boolean }) {
  const [reportOpen, setReportOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const { toast } = useToast();

  async function share() {
    const url = location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title, text: shareText, url });
        return;
      } catch (e: any) {
        if (e?.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      toast({ tone: "success", title: "Link copied" });
    } catch {}
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {hasFile && (
        <a href={downloadUrl} className={buttonVariants({ className: "flex-1 sm:flex-none" })} download={filename}>
          <Download /> Download PDF
        </a>
      )}
      <SaveButton paperId={paper.id} initial={saved} />
      <div className="hidden items-center gap-2 sm:flex">
        <ShareButton title={title} text={shareText} />
        {canEdit && <EditPaperDialog paper={paper} />}
        <ReportDialog paperId={paper.id} />
      </div>
      <div className="sm:hidden">
        <Dropdown
          label="More actions"
          trigger={({ toggle, open, id }) => (
            <button onClick={toggle} aria-expanded={open} aria-controls={id} aria-haspopup="menu" aria-label="More actions" className={buttonVariants({ variant: "outline", size: "icon" })}>
              <MoreHorizontal />
            </button>
          )}
        >
          <DropdownItem onSelect={share}><Share2 /> Share</DropdownItem>
          {canEdit && <DropdownItem onSelect={() => setEditOpen(true)}><Pencil /> Edit details</DropdownItem>}
          <DropdownItem onSelect={() => setReportOpen(true)} destructive><Flag /> Report a problem</DropdownItem>
        </Dropdown>
        {canEdit && <EditPaperDialog paper={paper} hideTrigger open={editOpen} onOpenChange={setEditOpen} />}
        <ReportDialog paperId={paper.id} hideTrigger open={reportOpen} onOpenChange={setReportOpen} />
      </div>
    </div>
  );
}
