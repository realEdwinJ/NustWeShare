"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen, Download, GraduationCap, KeyRound, LogOut, Monitor, Moon, Palette, Shield, Sun, Trash2, User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AVATAR_SWATCH } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { FieldError, FieldHint, Input, Label, Select, Textarea } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import { useTheme, type ThemePref } from "@/components/providers/theme";
import { PinInput } from "@/components/auth/AuthForm";
import { RecoveryCodeDialog } from "@/components/auth/RecoveryCodeDialog";
import { AVATAR_COLORS, weakPinReason } from "@/lib/account/validation";
import { formatDate } from "@/lib/papers/format";
import { RelTime } from "@/components/ui/rel-time";

type U = {
  username: string; displayName: string; bio: string; avatarColor: string; avatarEmoji: string; programmeCode: string; studyYear: number | null;
  publicProfile: boolean; showOnLeaderboard: boolean; uploadAnonymously: boolean; preferences: Record<string, any>;
  lastLoginAt: string | null; pinChangedAt: string | null; recoveryCreatedAt: string | null; createdAt: string;
};

const SECTIONS = [
  { id: "profile", label: "Profile", icon: User },
  { id: "study", label: "Study", icon: GraduationCap },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "reader", label: "Reader & downloads", icon: BookOpen },
  { id: "privacy", label: "Privacy", icon: Shield },
  { id: "security", label: "Security", icon: KeyRound },
  { id: "data", label: "Your data", icon: Download },
];
const EMOJIS = ["", "📚", "🎓", "🧠", "⚡", "🔥", "🚀", "🦁", "🌍", "💻", "⚙️", "🏗️", "📐", "🧪", "🎧", "☕"];

function Section({ id, title, description, children }: { id: string; title: string; description?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 rounded-2xl border bg-card">
      <div className="border-b px-5 py-4 sm:px-6">
        <h2 className="font-semibold">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
      </div>
      <div className="px-5 py-5 sm:px-6">{children}</div>
    </section>
  );
}

function Row({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-6 py-3 first:pt-0 last:pb-0">
      <div>
        <p className="text-sm font-medium">{title}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Segmented<T extends string>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: { v: T; l: string; icon?: React.ComponentType<{ className?: string }> }[]; label: string }) {
  return (
    <div className="inline-flex flex-wrap rounded-xl border bg-surface p-0.5" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button key={o.v} role="radio" aria-checked={value === o.v} onClick={() => onChange(o.v)} className={cn("inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-sm", value === o.v ? "bg-secondary font-medium" : "text-muted-foreground hover:text-foreground")}>
          {o.icon && <o.icon className="size-4" />}
          {o.l}
        </button>
      ))}
    </div>
  );
}

export function SettingsClient({ user, programmes }: { user: U; programmes: { code: string; name: string }[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const [p, setP] = useState(user);
  const [saving, setSaving] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [activeSection, setActiveSection] = useState("profile");

  useEffect(() => {
    const io = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && setActiveSection(e.target.id)), { rootMargin: "-30% 0px -60% 0px" });
    SECTIONS.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) io.observe(el);
    });
    return () => io.disconnect();
  }, []);

  async function save(section: string, body: Record<string, unknown>, quiet = false) {
    setSaving(section);
    setErrors((e) => ({ ...e, [section]: "" }));
    try {
      const r = await fetch("/api/account", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const j = (await r.json()) as any;
      if (!r.ok) {
        setErrors((e) => ({ ...e, [section]: j.error?.message || "Couldn't save." }));
        return false;
      }
      if (!quiet) toast({ tone: "success", title: "Saved" });
      router.refresh();
      return true;
    } finally {
      setSaving(null);
    }
  }

  const prefs = p.preferences;
  const setPref = (k: string, v: unknown) => {
    setP((x) => ({ ...x, preferences: { ...x.preferences, [k]: v } }));
    save("prefs", { preferences: { [k]: v } }, true).then((ok) => ok && toast({ tone: "success", title: "Preference saved" }));
  };
  const setFlag = (k: "publicProfile" | "showOnLeaderboard" | "uploadAnonymously", v: boolean) => {
    setP((x) => ({ ...x, [k]: v }));
    save("privacy", { [k]: v }, true).then((ok) => {
      if (ok) toast({ tone: "success", title: "Privacy updated" });
      else setP((x) => ({ ...x, [k]: !v }));
    });
  };

  // Security
  const [cur, setCur] = useState("");
  const [n1, setN1] = useState("");
  const [n2, setN2] = useState("");
  const pinWeak = n1.length === 5 ? weakPinReason(n1) : null;
  async function changePin() {
    setSaving("pin");
    setErrors((e) => ({ ...e, pin: "" }));
    const r = await fetch("/api/account/pin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ currentPin: cur, newPin: n1 }) });
    const j = (await r.json()) as any;
    setSaving(null);
    if (!r.ok) return setErrors((e) => ({ ...e, pin: j.error?.message || "Couldn't change PIN." }));
    setCur(""); setN1(""); setN2("");
    toast({ tone: "success", title: "PIN changed", description: "Other devices have been signed out." });
    router.refresh();
  }
  async function logoutOthers() {
    const r = await fetch("/api/account/logout-all", { method: "POST" });
    if (r.ok) toast({ tone: "success", title: "Signed out of all other devices" });
  }

  // Recovery code
  const [recOpen, setRecOpen] = useState(false);
  const [recPin, setRecPin] = useState("");
  const [recErr, setRecErr] = useState("");
  const [recCode, setRecCode] = useState<string | null>(null);
  async function newRecoveryCode() {
    setSaving("recovery");
    setRecErr("");
    const r = await fetch("/api/account/recovery", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pin: recPin }) });
    const j = (await r.json()) as any;
    setSaving(null);
    if (!r.ok) return setRecErr(j.error?.message || "Couldn't create a code.");
    setRecOpen(false);
    setRecPin("");
    setRecCode(j.data.recoveryCode);
  }

  // Delete
  const [delOpen, setDelOpen] = useState(false);
  const [delPin, setDelPin] = useState("");
  const [delConfirm, setDelConfirm] = useState("");
  const [delErr, setDelErr] = useState("");
  async function deleteAccount() {
    setSaving("delete");
    const r = await fetch("/api/account", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pin: delPin, confirm: delConfirm }) });
    const j = (await r.json()) as any;
    setSaving(null);
    if (!r.ok) return setDelErr(j.error?.message || "Couldn't delete.");
    toast({ tone: "success", title: "Your profile was deleted" });
    router.push("/");
    router.refresh();
  }

  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-[220px_1fr]">
      <nav className="hidden lg:block" aria-label="Settings sections">
        <ul className="sticky top-24 space-y-0.5">
          {SECTIONS.map((s) => (
            <li key={s.id}>
              <a href={`#${s.id}`} className={cn("flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm", activeSection === s.id ? "bg-secondary font-medium" : "text-muted-foreground hover:bg-accent hover:text-foreground")}>
                <s.icon className="size-4" /> {s.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="min-w-0 space-y-6">
        <Section id="profile" title="Profile" description="How you appear on the leaderboard, your uploads and your public page.">
          <div className="flex items-center gap-4">
            <Avatar name={p.displayName || p.username} color={p.avatarColor} emoji={p.avatarEmoji} size="xl" />
            <div className="space-y-3">
              <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Avatar colour">
                {AVATAR_COLORS.map((c) => (
                  <button key={c} role="radio" aria-checked={p.avatarColor === c} aria-label={c} onClick={() => setP({ ...p, avatarColor: c })} className={cn("size-7 rounded-full ring-offset-2 ring-offset-card", AVATAR_SWATCH[c], p.avatarColor === c && "ring-2 ring-foreground")} />
                ))}
              </div>
              <div className="flex flex-wrap gap-1" role="radiogroup" aria-label="Avatar emoji">
                {EMOJIS.map((e) => (
                  <button key={e || "none"} role="radio" aria-checked={p.avatarEmoji === e} onClick={() => setP({ ...p, avatarEmoji: e })} className={cn("flex size-8 items-center justify-center rounded-lg border text-base", p.avatarEmoji === e ? "border-info bg-info-soft" : "hover:bg-accent")} aria-label={e || "Initials"}>
                    {e || <span className="text-[10px] font-semibold">Aa</span>}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="s-name">Display name</Label>
              <Input id="s-name" value={p.displayName} onChange={(e) => setP({ ...p, displayName: e.target.value })} maxLength={50} className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="s-user">Username</Label>
              <div className="relative mt-1.5">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">@</span>
                <Input id="s-user" value={p.username} onChange={(e) => setP({ ...p, username: e.target.value.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 20) })} className="pl-7" />
              </div>
              <FieldHint>Changing it changes your profile link.</FieldHint>
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="s-bio">Bio</Label>
              <Textarea id="s-bio" value={p.bio} onChange={(e) => setP({ ...p, bio: e.target.value })} maxLength={280} placeholder="e.g. 2nd-year Software Engineering. Happy to share my notes." className="mt-1.5" />
              <FieldHint>{280 - p.bio.length} characters left</FieldHint>
            </div>
          </div>
          {errors.profile && <FieldError>{errors.profile}</FieldError>}
          <div className="mt-5 flex justify-end">
            <Button loading={saving === "profile"} onClick={() => save("profile", { displayName: p.displayName, username: p.username, bio: p.bio, avatarColor: p.avatarColor, avatarEmoji: p.avatarEmoji || null })}>
              Save profile
            </Button>
          </div>
        </Section>

        <Section id="study" title="Study" description="Used to personalise your home page. Visible on your public profile.">
          <div className="grid gap-4 sm:grid-cols-[1fr_160px]">
            <div>
              <Label htmlFor="s-prog">Programme</Label>
              <Select id="s-prog" value={p.programmeCode} onChange={(e) => setP({ ...p, programmeCode: e.target.value })} className="mt-1.5">
                <option value="">Not set</option>
                {programmes.map((x) => <option key={x.code} value={x.code}>{x.name} ({x.code})</option>)}
              </Select>
            </div>
            <div>
              <Label htmlFor="s-year">Year of study</Label>
              <Select id="s-year" value={p.studyYear ?? ""} onChange={(e) => setP({ ...p, studyYear: e.target.value ? Number(e.target.value) : null })} className="mt-1.5">
                <option value="">Not set</option>
                {[1, 2, 3, 4, 5, 6].map((y) => <option key={y} value={y}>Year {y}</option>)}
              </Select>
            </div>
          </div>
          {errors.study && <FieldError>{errors.study}</FieldError>}
          <div className="mt-5 flex justify-end">
            <Button loading={saving === "study"} onClick={() => save("study", { programmeCode: p.programmeCode || null, studyYear: p.studyYear })}>Save</Button>
          </div>
        </Section>

        <Section id="appearance" title="Appearance">
          <div className="divide-y">
            <Row title="Theme" hint="Synced to every device you sign in on.">
              <Segmented<ThemePref>
                label="Theme"
                value={(prefs.theme as ThemePref) ?? theme}
                onChange={(v) => {
                  setTheme(v);
                  setPref("theme", v);
                }}
                options={[{ v: "light", l: "Light", icon: Sun }, { v: "dark", l: "Dark", icon: Moon }, { v: "system", l: "Auto", icon: Monitor }]}
              />
            </Row>
            <Row title="Reduce motion" hint="Turn off animations and smooth scrolling.">
              <Switch
                checked={!!prefs.reduceMotion}
                onCheckedChange={(v) => {
                  try {
                    localStorage.setItem("nws-reduce-motion", v ? "1" : "0");
                  } catch {}
                  document.documentElement.classList.toggle("reduce-motion", v);
                  setPref("reduceMotion", v);
                }}
                label="Reduce motion"
              />
            </Row>
          </div>
        </Section>

        <Section id="reader" title="Reader & downloads">
          <div className="divide-y">
            <Row title="Default zoom" hint="How papers open in the reader.">
              <Segmented label="Default zoom" value={(prefs.viewerZoom as string) ?? "fit-width"} onChange={(v) => setPref("viewerZoom", v)} options={[{ v: "fit-width", l: "Fit width" }, { v: "fit-page", l: "Fit page" }, { v: "100", l: "100%" }]} />
            </Row>
            <Row title="Downloaded file names" hint="Clean: MCI511S_2024_S1_Exam.pdf · Original: as uploaded.">
              <Segmented label="File names" value={(prefs.downloadNaming as string) ?? "clean"} onChange={(v) => setPref("downloadNaming", v)} options={[{ v: "clean", l: "Clean" }, { v: "original", l: "Original" }]} />
            </Row>
            <Row title="ZIP layout" hint="Bulk & whole-module downloads.">
              <Segmented label="ZIP layout" value={(prefs.zipGrouping as string) ?? "by-year"} onChange={(v) => setPref("zipGrouping", v)} options={[{ v: "by-year", l: "Folder per year" }, { v: "flat", l: "Single folder" }]} />
            </Row>
          </div>
        </Section>

        <Section id="privacy" title="Privacy" description="NustWeShare never asks for your real name, email or phone number.">
          <div className="divide-y">
            <Row title="Public profile" hint="Others can open /u/your-username and see your shared papers.">
              <Switch checked={p.publicProfile} onCheckedChange={(v) => setFlag("publicProfile", v)} label="Public profile" />
            </Row>
            <Row title="Show me on the leaderboard" hint="Your papers still count, just without your name.">
              <Switch checked={p.showOnLeaderboard} onCheckedChange={(v) => setFlag("showOnLeaderboard", v)} label="Show on leaderboard" />
            </Row>
            <Row title="Upload anonymously by default" hint="You can still change it per upload.">
              <Switch checked={p.uploadAnonymously} onCheckedChange={(v) => setFlag("uploadAnonymously", v)} label="Upload anonymously by default" />
            </Row>
          </div>
          {errors.privacy && <FieldError>{errors.privacy}</FieldError>}
        </Section>

        <Section id="security" title="Security">
          <p className="text-sm text-muted-foreground">
            Recovery code {user.recoveryCreatedAt ? <RelTime date={user.recoveryCreatedAt} prefix="created " /> : "not set — create one so you can reset a forgotten PIN"} · Last sign-in {user.lastLoginAt ? <RelTime date={user.lastLoginAt} /> : "—"} · PIN {user.pinChangedAt ? <RelTime date={user.pinChangedAt} prefix="changed " /> : "never changed"}
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <PinInput id="pin-cur" value={cur} onChange={setCur} autoComplete="current-password" label="Current PIN" />
            <PinInput id="pin-new" value={n1} onChange={setN1} autoComplete="new-password" label="New PIN" invalid={!!pinWeak} />
            <PinInput id="pin-new2" value={n2} onChange={setN2} autoComplete="new-password" label="Confirm new PIN" invalid={n2.length === 5 && n1 !== n2} />
          </div>
          {pinWeak ? <FieldError>{pinWeak}</FieldError> : errors.pin ? <FieldError>{errors.pin}</FieldError> : null}
          <div className="mt-5 flex flex-wrap justify-between gap-3">
            <Button variant="outline" onClick={logoutOthers}><LogOut /> Sign out other devices</Button>
            <Button variant="outline" onClick={() => setRecOpen(true)}><KeyRound /> New recovery code</Button>
            <Button onClick={changePin} loading={saving === "pin"} disabled={cur.length !== 5 || n1.length !== 5 || n1 !== n2 || !!pinWeak}>Change PIN</Button>
          </div>
        </Section>

        <Section id="data" title="Your data">
          <div className="divide-y">
            <Row title="Export your data" hint="Profile, uploads and saved items as JSON.">
              <a href="/api/account/export" className="inline-flex h-9 items-center gap-2 rounded-xl border bg-surface px-3 text-sm font-medium hover:bg-accent">
                <Download className="size-4" /> Download
              </a>
            </Row>
            <Row title="Delete profile" hint="Your shared papers stay for other students, but become anonymous.">
              <Button variant="outline" className="text-destructive" onClick={() => setDelOpen(true)}>
                <Trash2 /> Delete
              </Button>
            </Row>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">Member since {formatDate(user.createdAt, { day: "numeric", month: "long", year: "numeric" })}</p>
        </Section>
      </div>

      <Dialog
        open={recOpen}
        onClose={() => setRecOpen(false)}
        title="Create a new recovery code"
        description="Your previous code will stop working."
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setRecOpen(false)}>Cancel</Button>
            <Button onClick={newRecoveryCode} loading={saving === "recovery"} disabled={recPin.length !== 5}>Create code</Button>
          </>
        }
      >
        <PinInput id="rec-pin" value={recPin} onChange={setRecPin} autoComplete="current-password" label="Confirm with your PIN" />
        {recErr && <FieldError>{recErr}</FieldError>}
      </Dialog>
      {recCode && <RecoveryCodeDialog open code={recCode} username={user.username} onDone={() => { setRecCode(null); router.refresh(); }} />}

      <Dialog
        open={delOpen}
        onClose={() => setDelOpen(false)}
        title="Delete your profile?"
        description="This can't be undone. Saved papers and followed modules are erased; uploads stay but become anonymous."
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDelOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={deleteAccount} loading={saving === "delete"} disabled={delPin.length !== 5 || delConfirm.toLowerCase() !== user.username.toLowerCase()}>
              Delete forever
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <Label htmlFor="del-confirm">Type <span className="font-mono">{user.username}</span> to confirm</Label>
            <Input id="del-confirm" value={delConfirm} onChange={(e) => setDelConfirm(e.target.value)} className="mt-1.5" autoComplete="off" />
          </div>
          <PinInput id="del-pin" value={delPin} onChange={setDelPin} autoComplete="current-password" label="Your PIN" />
          {delErr && <FieldError>{delErr}</FieldError>}
        </div>
      </Dialog>
    </div>
  );
}
