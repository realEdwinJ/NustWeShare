import { Container } from "@/components/ui/container";
import { UploadClient } from "@/components/upload/UploadClient";

export const metadata = { title: "Upload" };
export const dynamic = "force-dynamic";

export default function UploadPage() {
  return (
    <Container className="py-8 max-w-3xl">
      <h1 className="text-2xl font-bold tracking-tight">Upload Papers</h1>
      <p className="mt-1 text-sm text-muted-foreground">Past papers. Shared by students. No account needed — ghost uploads welcome. Module is required.</p>
      <div className="mt-6">
        <UploadClient />
      </div>
    </Container>
  );
}
