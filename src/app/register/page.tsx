import { Container } from "@/components/ui/container";
import { RegisterForm } from "@/components/auth/AuthForm";
import Link from "next/link";

export const metadata = { title: "Create profile" };

export default function RegisterPage() {
  return (
    <Container className="py-8 max-w-lg">
      <h1 className="text-2xl font-bold tracking-tight">Create profile</h1>
      <p className="mt-1 text-sm text-muted-foreground">Optional — you can always upload as Anonymous. No email, no OTP.</p>
      <div className="mt-6">
        <RegisterForm />
      </div>
      <p className="mt-4 text-sm text-muted-foreground">
        Already have a profile? <Link href="/login" className="underline">Login</Link>
      </p>
    </Container>
  );
}
