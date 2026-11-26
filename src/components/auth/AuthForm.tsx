"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { Input, Label, FieldHint, FieldError } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { weakPinReason } from "@/lib/account/validation";
import { RecoveryCodeDialog } from "./RecoveryCodeDialog";

function safeNext(n: string | null) {
  return n && n.startsWith("/") && !n.startsWith("//") ? n : "/dashboard";
}

export function PinInput({ id, value, onChange, autoComplete, label = "5-digit PIN", invalid }: { id: string; value: string; onChange: (v: string) => void; autoComplete: string; label?: string; invalid?: boolean }) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <div className="relative mt-1.5">
        <Input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 5))}
          inputMode="numeric"
          pattern="\d{5}"
          maxLength={5}
          type={show ? "text" : "password"}
          autoComplete={autoComplete}
          required
          aria-invalid={invalid || undefined}
          className="pr-11 font-mono tracking-[0.4em]"
          placeholder="•••••"
        />
        <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-lg p-2 text-muted-foreground hover:text-foreground" aria-label={show ? "Hide PIN" : "Show PIN"}>
          {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
    </div>
  );
}

export function RegisterForm() {
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [pin, setPin] = useState("");
  const [pin2, setPin2] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [recovery, setRecovery] = useState<string | null>(null);
  const router = useRouter();
  const params = useSearchParams();
  const { toast } = useToast();
  const weak = pin.length === 5 ? weakPinReason(pin) : null;
  const mismatch = pin2.length === 5 && pin !== pin2;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pin !== pin2) return setError("PINs don't match.");
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, displayName: displayName || username, pin }) });
      const json = (await res.json()) as any;
      if (!res.ok) return setError(json.error?.message || "Couldn't create your profile.");
      toast({ tone: "success", title: `Welcome, ${json.data.displayName}!`, description: "Your uploads will now count towards your profile." });
      if (json.data.recoveryCode) setRecovery(json.data.recoveryCode);
      else {
        router.push(safeNext(params.get("next")));
        router.refresh();
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <div>
        <Label htmlFor="r-user">Username</Label>
        <Input id="r-user" value={username} onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 20))} placeholder="e.g. tjiku_cs" autoComplete="username" required minLength={3} className="mt-1.5" />
        <FieldHint>3–20 letters, numbers or _. Not case-sensitive. Shown on the leaderboard.</FieldHint>
      </div>
      <div>
        <Label htmlFor="r-name">Display name <span className="font-normal text-muted-foreground">(optional)</span></Label>
        <Input id="r-name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="e.g. Tjiku" maxLength={50} className="mt-1.5" autoComplete="nickname" />
        <FieldHint>A nickname is perfect — no real names needed.</FieldHint>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <PinInput id="r-pin" value={pin} onChange={setPin} autoComplete="new-password" invalid={!!weak} />
        <PinInput id="r-pin2" value={pin2} onChange={setPin2} autoComplete="new-password" label="Confirm PIN" invalid={mismatch} />
      </div>
      {weak ? <FieldError>{weak}</FieldError> : mismatch ? <FieldError>PINs don&apos;t match.</FieldError> : <FieldHint className="-mt-3">No email or phone number. You&apos;ll get a one-time recovery code in case you forget your PIN.</FieldHint>}
      {error && <p role="alert" className="rounded-xl bg-destructive-soft px-3.5 py-2.5 text-sm text-destructive">{error}</p>}
      <Button type="submit" loading={loading} className="w-full" size="lg" disabled={username.length < 3 || pin.length !== 5 || pin !== pin2 || !!weak}>
        Create profile
      </Button>
      {recovery && (
        <RecoveryCodeDialog
          open
          code={recovery}
          username={username}
          onDone={() => {
            router.push(safeNext(params.get("next")));
            router.refresh();
          }}
        />
      )}
      <p className="text-center text-sm text-muted-foreground">
        Already have one? <Link href={`/login${params.get("next") ? `?next=${encodeURIComponent(params.get("next")!)}` : ""}`} className="font-medium text-info hover:underline">Log in</Link>
      </p>
    </form>
  );
}

export function LoginForm() {
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const params = useSearchParams();
  const { toast } = useToast();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, pin, remember }) });
      const json = (await res.json()) as any;
      if (!res.ok) {
        setPin("");
        return setError(json.error?.message || "Login failed.");
      }
      toast({ tone: "success", title: `Welcome back, ${json.data.displayName}` });
      router.push(safeNext(params.get("next")));
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div>
        <Label htmlFor="l-user">Username</Label>
        <Input id="l-user" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" required className="mt-1.5" autoFocus />
      </div>
      <div>
        <PinInput id="l-pin" value={pin} onChange={setPin} autoComplete="current-password" label="PIN" />
        <Link href="/reset" className="mt-1.5 inline-block text-xs font-medium text-info hover:underline">Forgot your PIN?</Link>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="size-4 accent-[var(--info)]" /> Keep me signed in for 30 days
      </label>
      {error && <p role="alert" className="rounded-xl bg-destructive-soft px-3.5 py-2.5 text-sm text-destructive">{error}</p>}
      <Button type="submit" loading={loading} className="w-full" size="lg" disabled={!username || pin.length !== 5}>
        Log in
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        New here? <Link href="/register" className="font-medium text-info hover:underline">Create a free profile</Link>
      </p>
    </form>
  );
}

export function ResetForm() {
  const [username, setUsername] = useState("");
  const [code, setCode] = useState("");
  const [pin, setPin] = useState("");
  const [pin2, setPin2] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [newCode, setNewCode] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();
  const weak = pin.length === 5 ? weakPinReason(pin) : null;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pin !== pin2) return setError("PINs don't match.");
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/recover", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, code, newPin: pin }) });
      const json = (await res.json()) as any;
      if (!res.ok) return setError(json.error?.message || "Couldn't reset your PIN.");
      toast({ tone: "success", title: "PIN reset — you're signed in", description: "All other devices were signed out." });
      setNewCode(json.data.recoveryCode);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div>
        <Label htmlFor="rs-user">Username</Label>
        <Input id="rs-user" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" required className="mt-1.5" autoFocus />
      </div>
      <div>
        <Label htmlFor="rs-code">Recovery code</Label>
        <Input id="rs-code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="XXXXX-XXXXX-XXXXX" autoComplete="one-time-code" required className="mt-1.5 font-mono tracking-wider" />
        <FieldHint>Shown once when you created your profile (or in Settings → Security).</FieldHint>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <PinInput id="rs-pin" value={pin} onChange={setPin} autoComplete="new-password" label="New PIN" invalid={!!weak} />
        <PinInput id="rs-pin2" value={pin2} onChange={setPin2} autoComplete="new-password" label="Confirm new PIN" invalid={pin2.length === 5 && pin !== pin2} />
      </div>
      {weak && <FieldError>{weak}</FieldError>}
      {error && <p role="alert" className="rounded-xl bg-destructive-soft px-3.5 py-2.5 text-sm text-destructive">{error}</p>}
      <Button type="submit" loading={loading} className="w-full" size="lg" disabled={!username || code.length < 12 || pin.length !== 5 || pin !== pin2 || !!weak}>
        Reset PIN
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        Lost your code too? <Link href="/contact" className="font-medium text-info hover:underline">Contact a moderator</Link>
      </p>
      {newCode && (
        <RecoveryCodeDialog
          open
          code={newCode}
          username={username}
          onDone={() => {
            router.push("/dashboard");
            router.refresh();
          }}
        />
      )}
    </form>
  );
}
