export default function RunsLoading() {
  return (
    <div className="flex flex-col gap-6">
      <header>
        <div className="h-7 w-24 animate-pulse rounded bg-secondary/60 ar-shimmer" />
        <div className="mt-2 h-4 w-72 animate-pulse rounded bg-secondary/40 ar-shimmer" />
      </header>
      <div className="h-14 animate-pulse rounded-lg border bg-card/60 ar-shimmer" />
      <div className="overflow-hidden rounded-lg border bg-card">
        <ul className="divide-y [border-color:var(--border)]">
          {Array.from({ length: 5 }).map((_, i) => (
            <li key={i} className="flex items-center gap-3 px-4 py-3">
              <div className="size-5 animate-pulse rounded-full bg-secondary/60 ar-shimmer" />
              <div className="h-4 w-20 animate-pulse rounded bg-secondary/50 ar-shimmer" />
              <div className="h-4 flex-1 animate-pulse rounded bg-secondary/40 ar-shimmer" />
              <div className="h-4 w-16 animate-pulse rounded bg-secondary/50 ar-shimmer" />
              <div className="h-4 w-12 animate-pulse rounded bg-secondary/50 ar-shimmer" />
              <div className="h-4 w-16 animate-pulse rounded bg-secondary/40 ar-shimmer" />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
