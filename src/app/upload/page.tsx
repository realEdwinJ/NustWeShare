import { Suspense } from "react";
import { Container } from "@/components/ui/container";
import { PageHeader } from "@/components/ui/page-header";
import { UploadClient } from "@/components/upload/UploadClient";

export const metadata = { title: "Upload papers", description: "Share NUST past papers anonymously in under a minute." };
export const dynamic = "force-dynamic";

export default function UploadPage() {
  return (
    <Container className="max-w-3xl py-8 sm:py-10">
      <PageHeader title="Share past papers" description="No account needed. Pick the module, drop your PDFs, check the details, done." />
      <div className="mt-8">
        <Suspense>
          <UploadClient />
        </Suspense>
      </div>
    </Container>
  );
}
