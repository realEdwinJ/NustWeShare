import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/AuthShell";
import { LoginForm } from "@/components/auth/AuthForm";
import { getCurrentUser } from "@/lib/auth/current";

export const dynamic = "force-dynamic";
export const metadata = { title: "Log in", robots: { index: false } };

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/dashboard");
  return (
    <AuthShell title="Welcome back" subtitle="Log in with your username and PIN.">
      <Suspense>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
