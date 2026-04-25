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
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Rooms</h1>
          <p className="mt-1 text-sm text-muted-foreground">Organize your runs and agents by project.</p>
        </div>
        <CreateRoomDialog />
      </header>

      {rooms.length ? (
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
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
          title="Rooms organize your work."
          description="Create one to start grouping runs, agents, and history by project."
        />
      )}
    </div>
  );
}
