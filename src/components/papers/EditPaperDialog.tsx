"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input, Label, Select } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { ASSESSMENT_TYPES, TYPE_LABEL, typeHasNumber } from "@/lib/papers/format";

type P = { id: string; moduleCode: string; academicYear: number; semester: number; assessmentType: string; assessmentNumber: number | null };

export function EditPaperDialog({ paper, compact }: { paper: P; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [f, setF] = useState({ ...paper, assessmentNumber: paper.assessmentNumber ?? "" as number | "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();
  const thisYear = new Date().getFullYear();

  async function save() {
    setBusy(true);
    setErr(null);
    const res = await fetch(`/api/papers/${paper.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        moduleCode: f.moduleCode,
        academicYear: f.academicYear,
        semester: f.semester,
        assessmentType: f.assessmentType,
        assessmentNumber: typeHasNumber(f.assessmentType) && f.assessmentNumber !== "" ? Number(f.assessmentNumber) : null,
      }),
    });
    const j = (await res.json()) as any;
    setBusy(false);
    if (!res.ok) return setErr(j.error?.message || "Couldn't save.");
    setOpen(false);
    toast({ tone: "success", title: "Paper details updated" });
    router.refresh();
  }

  async function remove() {
    setBusy(true);
    const res = await fetch(`/api/papers/${paper.id}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) return setErr("Couldn't remove the paper.");
    toast({ tone: "success", title: "Paper removed" });
    router.push(`/modules/${paper.moduleCode.toLowerCase()}`);
    router.refresh();
  }

  return (
    <>
      <Button variant="ghost" size={compact ? "sm" : "default"} onClick={() => setOpen(true)}>
        <Pencil /> Edit
      </Button>
      <Dialog
        open={open}
        onClose={() => { setOpen(false); setConfirmDelete(false); }}
        title="Edit paper details"
        description="Fix mistakes so classmates can find it."
        footer={
          confirmDelete ? (
            <>
              <span className="mr-auto self-center text-sm text-destructive">Remove this paper for everyone?</span>
              <Button variant="ghost" onClick={() => setConfirmDelete(false)}>Keep</Button>
              <Button variant="destructive" onClick={remove} loading={busy}>Remove</Button>
            </>
          ) : (
            <>
              <Button variant="ghost" className="mr-auto text-destructive" onClick={() => setConfirmDelete(true)}>
                <Trash2 /> Remove
              </Button>
              <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={save} loading={busy}>Save changes</Button>
            </>
          )
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="ep-mod">Module code</Label>
            <Input id="ep-mod" value={f.moduleCode} onChange={(e) => setF({ ...f, moduleCode: e.target.value.toUpperCase() })} className="mt-1.5 font-mono" />
          </div>
          <div>
            <Label htmlFor="ep-type">Type</Label>
            <Select id="ep-type" value={f.assessmentType} onChange={(e) => setF({ ...f, assessmentType: e.target.value })} className="mt-1.5">
              {ASSESSMENT_TYPES.map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
            </Select>
          </div>
          <div>
            <Label htmlFor="ep-num">Number</Label>
            <Select id="ep-num" value={String(f.assessmentNumber)} onChange={(e) => setF({ ...f, assessmentNumber: e.target.value ? Number(e.target.value) : "" })} disabled={!typeHasNumber(f.assessmentType)} className="mt-1.5">
              <option value="">—</option>
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}</option>)}
            </Select>
          </div>
          <div>
            <Label htmlFor="ep-year">Year</Label>
            <Select id="ep-year" value={f.academicYear} onChange={(e) => setF({ ...f, academicYear: Number(e.target.value) })} className="mt-1.5">
              {Array.from({ length: 20 }, (_, i) => thisYear + 1 - i).map((y) => <option key={y} value={y}>{y}</option>)}
            </Select>
          </div>
          <div>
            <Label htmlFor="ep-sem">Semester</Label>
            <Select id="ep-sem" value={f.semester} onChange={(e) => setF({ ...f, semester: Number(e.target.value) })} className="mt-1.5">
              <option value={1}>Semester 1</option>
              <option value={2}>Semester 2</option>
            </Select>
          </div>
        </div>
        {err && <p className="mt-3 text-sm text-destructive" role="alert">{err}</p>}
      </Dialog>
    </>
  );
}
