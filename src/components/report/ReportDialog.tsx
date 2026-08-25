"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const REASONS = [
  { value: "duplicate", label: "Duplicate" },
  { value: "wrong_module", label: "Wrong module" },
  { value: "wrong_year", label: "Wrong year" },
  { value: "wrong_assessment_type", label: "Wrong assessment type" },
  { value: "corrupted", label: "Corrupted / unreadable" },
  { value: "not_paper", label: "Not a past paper" },
  { value: "other", label: "Other" },
] as const;

export function ReportDialog({ paperId }: { paperId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string>("duplicate");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setSubmitting(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`/api/papers/${paperId}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason, details: details || null }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error?.message || "Failed to report.");
      } else {
        if (json.deleted) setResult("Paper removed after 5 reports. Thank you for keeping the community clean.");
        else setResult(`Report received. Thank you. (${json.reportCount}/5)`);
        // Close after success? Keep open to show result
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="inline-flex items-center justify-center rounded-xl border bg-background px-5 py-2.5 text-sm font-medium hover:bg-accent min-h-[44px]">
        Report
      </button>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Report this paper</CardTitle>
        <CardDescription>Anonymous — one report per person. 5 reports auto-removes the paper.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2" role="radiogroup" aria-label="Report reason">
          {REASONS.map((r) => (
            <label key={r.value} className="flex items-center gap-2 text-sm">
              <input type="radio" name="reason" value={r.value} checked={reason === r.value} onChange={() => setReason(r.value)} className="h-4 w-4" />
              {r.label}
            </label>
          ))}
        </div>
        {reason === "other" && (
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="Tell us more (optional, max 500 chars)"
            maxLength={500}
            className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm min-h-[80px]"
          />
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
        {result && <p className="text-sm text-emerald-700 bg-emerald-50 rounded-xl px-3 py-2">{result}</p>}
        <div className="flex gap-2">
          <Button onClick={submit} disabled={submitting} loading={submitting}>
            {submitting ? "Reporting…" : "Submit report"}
          </Button>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={submitting}>
            Close
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
