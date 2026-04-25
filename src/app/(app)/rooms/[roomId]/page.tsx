import { RoomConsole } from "@/components/console";
import { RoomNotFound } from "@/components/rooms/room-not-found";
import { getRoomBySlug } from "@/lib/mock-data";

export default async function RoomDetailPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params;
  const room = getRoomBySlug(roomId);
  if (!room) return <RoomNotFound />;

  return <RoomConsole room={room} />;
}
