"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowBigUp, HandHelping, Plus } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input, Label, Select } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { ASSESSMENT_TYPES, TYPE_LABEL, timeAgo } from "@/lib/papers/format";

type Req = { id: string; academicYear: number | null; assessmentType: string | null; note: string | null; votes: number; createdAt: string };

export function PaperRequests({ moduleCode }: { moduleCode: string }) {
  const [items, setItems] = useState<Req[] | null>(null);
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState("");
  const [type, setType] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [voted, setVoted] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const thisYear = new Date().getFullYear();

  async function load() {
    try {
      const r = await fetch(`/api/modules/${moduleCode}/requests`);
      const j = (await r.json()) as any;
      setItems(j.data ?? []);
    } catch {
      setItems([]);
    }
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moduleCode]);

  async function submit() {
    setBusy(true);
    try {
      const r = await fetch(`/api/modules/${moduleCode}/requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ academicYear: year || null, assessmentType: type || null, note: note || null }),
      });
      const j = (await r.json()) as any;
      if (!r.ok) throw new Error(j.error?.message);
      toast({ tone: "success", title: j.data.merged ? "Someone already asked — we added your vote" : "Request posted", description: "You'll see it marked done when someone uploads it." });
      setOpen(false);
      setYear("");
      setType("");
      setNote("");
      load();
    } catch (e: any) {
      toast({ tone: "error", title: e?.message || "Couldn't post request" });
    } finally {
      setBusy(false);
    }
  }

  async function vote(id: string) {
    setVoted((v) => new Set(v).add(id));
    const r = await fetch(`/api/requests/${id}/vote`, { method: "POST" });
    const j = (await r.json()) as any;
    if (r.ok) {
      setItems((list) => list?.map((x) => (x.id === id ? { ...x, votes: j.data.votes } : x)) ?? null);
      if (j.data.alreadyVoted) toast({ title: "You've already upvoted this" });
    }
  }

  const label = (r: Req) => [r.assessmentType ? TYPE_LABEL[r.assessmentType as keyof typeof TYPE_LABEL] : "Any paper", r.academicYear ?? "any year"].join(" · ");

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <HandHelping className="size-4 text-warning" /> Requested papers
          </h2>
          <p className="text-sm text-muted-foreground">Missing something? Ask — classmates who have it will see the request.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
          <Plus /> Request
        </Button>
      </div>
      <div className="mt-3 space-y-2">
        {items === null ? (
          <div className="skeleton h-12 rounded-xl" />
        ) : items.length === 0 ? (
          <p className="rounded-xl border border-dashed px-4 py-4 text-center text-sm text-muted-foreground">No open requests for {moduleCode}.</p>
        ) : (
          items.map((r) => (
            <div key={r.id} className="flex items-center gap-3 rounded-xl border bg-card px-3 py-2.5">
              <button
                onClick={() => vote(r.id)}
                disabled={voted.has(r.id)}
                className="flex w-11 shrink-0 flex-col items-center rounded-lg border py-1 text-xs font-semibold tabular-nums hover:bg-accent disabled:text-info"
                aria-label={`Upvote request, ${r.votes} votes`}
              >
                <ArrowBigUp className="size-4" />
                {r.votes}
              </button>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{label(r)}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {r.note ? `“${r.note}” · ` : ""}
                  {timeAgo(r.createdAt)}
                </p>
              </div>
              <Link href={`/upload?module=${moduleCode}${r.academicYear ? `&year=${r.academicYear}` : ""}${r.assessmentType ? `&type=${r.assessmentType}` : ""}`} className={buttonVariants({ variant: "ghost", size: "sm" })}>
                I have it
              </Link>
            </div>
          ))
        )}
      </div>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={`Request a ${moduleCode} paper`}
        description="Leave fields empty if any paper would help."
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submit} loading={busy}>
              Post request
            </Button>
          </>
        }
      >
        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="rq-type">Type</Label>
              <Select id="rq-type" value={type} onChange={(e) => setType(e.target.value)} className="mt-1.5">
                <option value="">Any</option>
                {ASSESSMENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {TYPE_LABEL[t]}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="rq-year">Year</Label>
              <Select id="rq-year" value={year} onChange={(e) => setYear(e.target.value)} className="mt-1.5">
                <option value="">Any</option>
                {Array.from({ length: 12 }, (_, i) => thisYear - i).map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div>
            <Label htmlFor="rq-note">Note (optional)</Label>
            <Input id="rq-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} placeholder="e.g. with memo, if possible" className="mt-1.5" />
          </div>
        </div>
      </Dialog>
    </div>
  );
}
