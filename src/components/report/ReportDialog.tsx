"use client";

import { useState } from "react";
import { Flag } from "lucide-react";
import { Button, type ButtonVariant } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

const REASONS = [
  { value: "wrong_module", label: "Wrong module", hint: "This paper belongs to a different module" },
  { value: "wrong_year", label: "Wrong year or semester", hint: "The date details are incorrect" },
  { value: "wrong_assessment_type", label: "Wrong paper type", hint: "e.g. it's a test, not an exam" },
  { value: "duplicate", label: "Duplicate", hint: "The same paper already exists" },
  { value: "corrupted", label: "Unreadable or corrupted", hint: "Blank pages, broken file, illegible scan" },
  { value: "not_paper", label: "Not a past paper", hint: "Notes, spam or something unrelated" },
  { value: "other", label: "Something else", hint: "Copyright, offensive content, other" },
] as const;

export function ReportDialog({ paperId, variant = "ghost" }: { paperId: string; variant?: ButtonVariant }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string>("");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  async function submit() {
    if (!reason) {
      setError("Choose a reason.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/papers/${paperId}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason, details: details.trim() || null }),
      });
      const json = (await res.json()) as any;
      if (!res.ok) {
        setError(json.error?.message || "Couldn't send the report.");
        return;
      }
      setOpen(false);
      toast({
        tone: "success",
        title: json.deleted ? "Paper removed" : "Report received — thank you",
        description: json.deleted ? "Enough students flagged it, so it's been taken down." : "Moderators will review it. Five reports remove a paper automatically.",
      });
      if (json.deleted) location.reload();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button variant={variant} onClick={() => setOpen(true)}>
        <Flag /> Report
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Report this paper"
        description="Reports are anonymous. One report per person."
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={submit} loading={busy}>
              Send report
            </Button>
          </>
        }
      >
        <fieldset className="grid gap-2">
          <legend className="sr-only">Reason</legend>
          {REASONS.map((r) => (
            <label
              key={r.value}
              className={cn("flex cursor-pointer items-start gap-3 rounded-xl border px-3.5 py-2.5 transition-colors hover:bg-accent", reason === r.value && "border-info bg-info-soft/60")}
            >
              <input type="radio" name="reason" value={r.value} checked={reason === r.value} onChange={() => setReason(r.value)} className="mt-1 accent-[var(--info)]" />
              <span>
                <span className="block text-sm font-medium">{r.label}</span>
                <span className="block text-xs text-muted-foreground">{r.hint}</span>
              </span>
            </label>
          ))}
        </fieldset>
        <Textarea value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Anything that helps moderators (optional)" maxLength={500} className="mt-3" aria-label="Details" />
        {error && <p className="mt-2 text-sm text-destructive" role="alert">{error}</p>}
      </Dialog>
    </>
  );
}
