"use client";

import Link from "next/link";
import { RoomCard } from "@/components/cards";
import { useAgentRoomStore } from "@/lib/store/agent-room-store";

export function RoomsIndex() {
  const { getRooms } = useAgentRoomStore();
  const rooms = getRooms();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">Rooms</p>
          <h1 className="mt-2 text-3xl font-semibold">Project operating rooms</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
            Each room represents a project, product, client, workflow, or launch system with its own agents, tools, tasks, and approvals.
          </p>
        </div>
        <Link
          href="/environments/new"
          className="inline-flex h-10 items-center justify-center rounded-md bg-secondary px-4 text-sm font-medium text-secondary-foreground transition-colors hover:bg-secondary/80"
        >
          Create Room
        </Link>
      </div>
      <div className="grid gap-4 md:grid-cols-3">{rooms.map((room) => <RoomCard key={room.id} room={room} featured={room.id === "room_fofit"} />)}</div>
    </div>
  );
}
