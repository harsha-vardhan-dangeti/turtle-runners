/** Neutral placeholder block used by every loading state. */
export function Skeleton({ className = '' }: { className?: string }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-xl bg-hairline/70 ${className}`} />;
}

export function CardSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="card p-6">
      <Skeleton className="h-6 w-40" />
      <div className="mt-5 space-y-3">
        {Array.from({ length: lines }).map((_, index) => (
          <Skeleton key={index} className="h-4 w-full" />
        ))}
      </div>
    </div>
  );
}
