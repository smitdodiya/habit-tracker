/**
 * Loading placeholders.
 *
 * These mirror the shape of the content that will replace them, so the page
 * doesn't jump when data arrives — and `aria-hidden` keeps the shimmer out of
 * the screen-reader experience, where a "loading" announcement is enough.
 */

export function Skeleton({ className = '', rounded = 'rounded-[12px]' }) {
  return <div aria-hidden="true" className={`skeleton ${rounded} ${className}`} />;
}

/** Matches the footprint of a HabitCard. */
export function HabitCardSkeleton() {
  return (
    <div className="card flex items-center gap-3.5 p-3.5">
      <Skeleton className="h-11 w-11" rounded="rounded-[14px]" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3.5 w-2/5" rounded="rounded-md" />
        <Skeleton className="h-3 w-1/4" rounded="rounded-md" />
      </div>
      <Skeleton className="h-11 w-11" rounded="rounded-full" />
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="card space-y-2.5 p-4">
      <Skeleton className="h-3 w-20" rounded="rounded-md" />
      <Skeleton className="h-7 w-16" rounded="rounded-md" />
    </div>
  );
}

export function PageSkeleton({ cards = 4 }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading">
      {Array.from({ length: cards }, (_, index) => (
        <HabitCardSkeleton key={index} />
      ))}
    </div>
  );
}
