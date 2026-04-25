import { RoomConsole } from "@/components/console";
import { RoomResolver } from "@/components/rooms/room-resolver";
import { getRoomBySlug } from "@/lib/mock-data";

export default async function RoomDetailPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params;
  const room = getRoomBySlug(roomId);
  if (!room) return <RoomResolver roomSlug={roomId} />;

  return <RoomConsole room={room} />;
}
