"use client";

import { useState } from "react";
import { Check, Copy, Download, KeyRound } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

/** Shows a one-time recovery code; the user must confirm they saved it. */
export function RecoveryCodeDialog({ code, username, open, onDone }: { code: string; username: string; open: boolean; onDone: () => void }) {
  const [copied, setCopied] = useState(false);
  const [ack, setAck] = useState(false);
  const download = () => {
    const blob = new Blob([`NustWeShare recovery code\nUsername: ${username}\nCode: ${code}\n\nUse it at /reset if you forget your PIN. It works once; you'll get a new one after using it.\n`], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `nustweshare-recovery-${username}.txt`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
  };
  return (
    <Dialog
      open={open}
      onClose={() => ack && onDone()}
      title={<span className="flex items-center gap-2"><KeyRound className="size-4 text-warning" /> Save your recovery code</span>}
      description="It's the only way back in if you forget your PIN — we never ask for an email. You won't see it again."
      size="sm"
      footer={<Button onClick={onDone} disabled={!ack}>I&apos;ve saved it — continue</Button>}
    >
      <div className="rounded-xl border-2 border-dashed border-warning/50 bg-warning-soft/40 px-4 py-5 text-center">
        <p className="select-all font-mono text-2xl font-semibold tracking-wider" data-testid="recovery-code">{code}</p>
      </div>
      <div className="mt-3 flex gap-2">
        <Button
          variant="outline"
          className="flex-1"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(code);
              setCopied(true);
            } catch {}
          }}
        >
          {copied ? <Check /> : <Copy />} {copied ? "Copied" : "Copy"}
        </Button>
        <Button variant="outline" className="flex-1" onClick={download}>
          <Download /> Save as file
        </Button>
      </div>
      <label className="mt-4 flex items-start gap-2 text-sm">
        <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} className="mt-0.5 size-4 accent-[var(--info)]" />
        I&apos;ve stored this code somewhere safe (screenshot, notes app or password manager).
      </label>
    </Dialog>
  );
}
