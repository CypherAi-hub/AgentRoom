import { RoomTasksResolver } from "@/components/rooms/room-subpage-resolvers";

export default async function RoomTasksPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params;

  return <RoomTasksResolver roomSlug={roomId} />;
}
