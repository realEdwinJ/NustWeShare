import { Container } from "@/components/ui/container";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Contact" };

export default function ContactPage() {
  return (
    <Container className="py-8 max-w-3xl">
      <h1 className="text-2xl font-bold tracking-tight">Contact</h1>
      <p className="mt-1 text-sm text-muted-foreground">Community project — lightweight, no 24/7 support, but we read every message.</p>
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Get in touch</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-3">
          <p>For takedown requests, use the info on /copyright. For bugs and academic data corrections, open an issue on GitHub.</p>
          <p className="text-xs">This is a student community archive — not an official NUST website.</p>
        </CardContent>
      </Card>
    </Container>
  );
}
