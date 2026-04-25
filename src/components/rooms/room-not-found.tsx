import Link from "next/link";

const linkClass =
  "inline-flex h-10 items-center justify-center rounded-md px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function RoomNotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="glass-panel max-w-xl rounded-lg border p-8 text-center">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">Room unavailable</p>
        <h1 className="mt-3 text-3xl font-semibold">Room not found</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          This room does not exist or has not been created yet.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/dashboard" className={linkClass + " bg-primary text-primary-foreground hover:bg-primary/90"}>
            Back to Dashboard
          </Link>
          <Link href="/rooms" className={linkClass + " border bg-transparent text-foreground hover:bg-secondary"}>
            View Rooms
          </Link>
        </div>
      </div>
    </div>
  );
}
