"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function RegisterForm() {
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, displayName, pin }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error?.message || "Failed to create profile.");
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create optional profile</CardTitle>
        <CardDescription>Username + 5-digit PIN. No email, no OTP. You can always upload as ghost.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium">Username *</label>
            <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="e.g. adonnis" required minLength={3} maxLength={20} pattern="[a-zA-Z0-9_]+" />
            <p className="text-xs text-muted-foreground mt-1">Case-insensitive: Adonnis = adonnis. Letters, numbers, underscore only.</p>
          </div>
          <div>
            <label className="text-sm font-medium">Display name *</label>
            <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="e.g. Adonnis" required maxLength={50} />
          </div>
          <div>
            <label className="text-sm font-medium">5-digit PIN *</label>
            <Input value={pin} onChange={(e) => setPin(e.target.value)} placeholder="12345" required pattern="\d{5}" maxLength={5} inputMode="numeric" type="password" />
            <p className="text-xs text-muted-foreground mt-1">PIN is not a normal password — keep it safe. Hashed, never stored plain.</p>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" loading={loading} className="w-full">
            Create profile
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export function LoginForm() {
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, pin }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error?.message || "Login failed.");
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Login</CardTitle>
        <CardDescription>Username + 5-digit PIN. 5 failed attempts → temporary lockout.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium">Username</label>
            <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="adonnis" required />
          </div>
          <div>
            <label className="text-sm font-medium">PIN</label>
            <Input value={pin} onChange={(e) => setPin(e.target.value)} placeholder="12345" required pattern="\d{5}" type="password" maxLength={5} inputMode="numeric" />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" loading={loading} className="w-full">
            Login
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
