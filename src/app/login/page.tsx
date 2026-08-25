import { Container } from "@/components/ui/container";
import { LoginForm } from "@/components/auth/AuthForm";
import Link from "next/link";

export const metadata = { title: "Login" };

export default function LoginPage() {
  return (
    <Container className="py-8 max-w-lg">
      <h1 className="text-2xl font-bold tracking-tight">Login</h1>
      <p className="mt-1 text-sm text-muted-foreground">Username + 5-digit PIN.</p>
      <div className="mt-6">
        <LoginForm />
      </div>
      <p className="mt-4 text-sm text-muted-foreground">
        No profile? <Link href="/register" className="underline">Create one</Link> — or upload as ghost.
      </p>
    </Container>
  );
}
