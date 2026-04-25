"use client";

import { RoomConsole } from "@/components/console";
import { RoomNotFound } from "@/components/rooms/room-not-found";
import { useAgentRoomStore } from "@/lib/store/agent-room-store";

export function RoomResolver({ roomSlug }: { roomSlug: string }) {
  const { hasMounted, getRoomBySlug } = useAgentRoomStore();
  const room = getRoomBySlug(roomSlug);

  if (!hasMounted) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="glass-panel max-w-xl rounded-lg border p-8 text-center">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">Checking room</p>
          <h1 className="mt-3 text-3xl font-semibold">Loading environment</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">Looking for saved local room context.</p>
        </div>
      </div>
    );
  }

  if (!room) return <RoomNotFound />;

  return <RoomConsole room={room} />;
}
