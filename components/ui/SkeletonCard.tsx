export function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-lg border-2 border-ink/20 bg-surface p-4">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-surface-alt" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-3/4 rounded bg-surface-alt" />
          <div className="h-3 w-1/2 rounded bg-surface-alt" />
        </div>
        <div className="h-5 w-20 rounded bg-surface-alt" />
      </div>
    </div>
  );
}
