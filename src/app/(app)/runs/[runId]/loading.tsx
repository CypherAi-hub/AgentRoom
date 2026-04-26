export default function RunDetailLoading() {
  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-4">
        <div className="h-3 w-12 animate-pulse rounded bg-secondary/40 ar-shimmer" />
        <div className="h-8 w-2/3 animate-pulse rounded bg-secondary/60 ar-shimmer" />
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col gap-2 rounded-lg border bg-card p-3"
          >
            <div className="h-3 w-16 animate-pulse rounded bg-secondary/50 ar-shimmer" />
            <div className="h-4 w-24 animate-pulse rounded bg-secondary/40 ar-shimmer" />
          </div>
        ))}
      </section>

      <section className="space-y-3">
        <div className="h-5 w-24 animate-pulse rounded bg-secondary/60 ar-shimmer" />
        <ol className="relative ml-2 border-l pl-6 [border-color:var(--border)]">
          {Array.from({ length: 3 }).map((_, i) => (
            <li key={i} className="relative pb-6 last:pb-0">
              <span className="absolute -left-[33px] top-1 inline-block size-2.5 rounded-full bg-secondary ring-4 ring-white/5" />
              <div className="flex flex-col gap-2">
                <div className="h-3 w-24 animate-pulse rounded bg-secondary/60 ar-shimmer" />
                <div className="h-12 w-full animate-pulse rounded bg-secondary/40 ar-shimmer" />
              </div>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
