import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getRooms } from "@/lib/data/rooms";
import { CreateRoomDialog } from "@/components/rooms/create-room-form";
import { EmptyState, StatusPill, relativeTime } from "@/components/dashboard/dashboard-shared";

export const dynamic = "force-dynamic";

export default async function RoomsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/rooms");

  const rooms = await getRooms(user.id);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Rooms</h1>
          <p className="mt-1 text-sm text-muted-foreground">Organize your runs and agents by project.</p>
        </div>
        <CreateRoomDialog />
      </header>

      {rooms.length ? (
        <ul className="grid gap-3 sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
          {rooms.map((room) => (
            <li key={room.id}>
              <Link
                href={`/rooms/${room.id}`}
                className="block rounded-lg border bg-card p-4 transition hover:bg-secondary/50"
              >
                <StatusPill status={room.status} />
                <h3 className="mt-3 text-base font-semibold">{room.name}</h3>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                  {room.description ?? "No description yet."}
                </p>
                <p className="mt-3 text-xs text-muted-foreground">Created {relativeTime(room.createdAt)}</p>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          emphasize
          title="No rooms yet."
          description="Rooms group related agents and runs together. Like Slack channels, but for AI work."
          cta={{ label: "Create a room", href: "/rooms" }}
          secondary={{ label: "Learn more", href: "/agents" }}
        />
      )}
    </div>
  );
}
