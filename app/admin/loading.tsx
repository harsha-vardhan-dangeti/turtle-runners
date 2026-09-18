import { CardSkeleton, Skeleton } from '@/components/ui/Skeleton';

export default function AdminLoading() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading admin data">
      <span className="sr-only">Loading club operations…</span>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="card p-5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-4 h-10 w-20" />
            <Skeleton className="mt-4 h-3 w-32" />
          </div>
        ))}
      </div>
      <CardSkeleton lines={6} />
    </div>
  );
}
