import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/AuthShell";
import { RegisterForm } from "@/components/auth/AuthForm";
import { getCurrentUser } from "@/lib/auth/current";

export const dynamic = "force-dynamic";
export const metadata = { title: "Create a profile", robots: { index: false } };

export default async function RegisterPage() {
  if (await getCurrentUser()) redirect("/dashboard");
  return (
    <AuthShell title="Create your profile" subtitle="Optional — everything works without one. A profile adds credit for uploads, saved papers on every device, and module alerts.">
      <Suspense>
        <RegisterForm />
      </Suspense>
    </AuthShell>
  );
}
