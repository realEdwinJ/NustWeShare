import { Container } from "@/components/ui/container";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <Container className="py-10" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="mt-4 h-9 w-72" />
      <Skeleton className="mt-3 h-4 w-full max-w-lg" />
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
    </Container>
  );
}
