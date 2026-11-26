import { Suspense } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { ResetForm } from "@/components/auth/AuthForm";

export const metadata = { title: "Reset your PIN", robots: { index: false } };

export default function ResetPage() {
  return (
    <AuthShell title="Reset your PIN" subtitle="Use the recovery code you saved when you created your profile.">
      <Suspense>
        <ResetForm />
      </Suspense>
    </AuthShell>
  );
}
