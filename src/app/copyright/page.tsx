import { Container } from "@/components/ui/container";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Copyright & Takedown" };

export default function CopyrightPage() {
  return (
    <Container className="py-8 max-w-3xl">
      <h1 className="text-2xl font-bold tracking-tight">Copyright & Takedown</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        NustWeShare is an independent student/community project and is not affiliated with, operated by, or officially
        endorsed by NUST unless explicit permission is obtained.
      </p>
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">If you believe a document should be removed</CardTitle>
        </CardHeader>
        <CardContent className="text-sm leading-relaxed text-muted-foreground space-y-3">
          <p>
            We respect copyright. If you are a rights holder and believe a paper should be removed, please contact us
            with the paper URL, your relationship to the material, and the reason. This is a lightweight,
            community-maintained process (Spec 89) — no automated legal advice, just a reasonable takedown channel.
          </p>
          <p>
            Contact: <a href="/contact" className="underline hover:text-foreground">/contact</a> — we will review and
            remove where appropriate. Unresolved disputes will default to removal to respect rights holders.
          </p>
        </CardContent>
      </Card>
    </Container>
  );
}
