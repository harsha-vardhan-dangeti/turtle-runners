import { CardSkeleton, Skeleton } from '@/components/ui/Skeleton';

export default function Loading() {
  return (
    <div className="section py-16" role="status" aria-label="Loading">
      <span className="sr-only">Loading the club…</span>
      <Skeleton className="h-4 w-48" />
      <Skeleton className="mt-6 h-20 w-full max-w-3xl" />
      <Skeleton className="mt-3 h-20 w-full max-w-2xl" />
      <Skeleton className="mt-3 h-20 w-full max-w-xl" />
      <div className="mt-12 grid gap-5 md:grid-cols-3">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    </div>
  );
}
