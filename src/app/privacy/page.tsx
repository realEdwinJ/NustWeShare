import { Container } from "@/components/ui/container";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Privacy" };

export default function PrivacyPage() {
  return (
    <Container className="py-8 max-w-3xl">
      <h1 className="text-2xl font-bold tracking-tight">Privacy</h1>
      <p className="mt-1 text-sm text-muted-foreground">Minimal tracking. No paywall. No sale of data.</p>
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">What we collect</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>Views, downloads, uploads, reports — approximate counts, deduplicated to avoid counting refreshes as hundreds (Spec 42).</p>
          <p>No invasive user tracking. Upload IPs are hashed for rate limiting and report deduplication, never exposed.</p>
          <p>Optional profiles store only username (case-insensitive unique), display name, hashed 5-digit PIN, and optional social handles you choose to display.</p>
        </CardContent>
      </Card>
    </Container>
  );
}
