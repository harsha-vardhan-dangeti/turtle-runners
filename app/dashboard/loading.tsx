import { CardSkeleton, Skeleton } from '@/components/ui/Skeleton';

export default function DashboardLoading() {
  return (
    <div className="section py-12" role="status" aria-label="Loading your dashboard">
      <span className="sr-only">Loading your week…</span>
      <Skeleton className="h-4 w-32" />
      <Skeleton className="mt-4 h-16 w-80 max-w-full" />
      <div className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <CardSkeleton lines={5} />
          <CardSkeleton lines={6} />
        </div>
        <div className="space-y-5">
          <CardSkeleton lines={2} />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    </div>
  );
}
