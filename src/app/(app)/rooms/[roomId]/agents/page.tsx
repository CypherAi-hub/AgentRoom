import { RoomAgentsResolver } from "@/components/rooms/room-subpage-resolvers";

export default async function RoomAgentsPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params;

  return <RoomAgentsResolver roomSlug={roomId} />;
}
