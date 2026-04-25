import { RoomActivityResolver } from "@/components/rooms/room-subpage-resolvers";

export default async function RoomActivityPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params;

  return <RoomActivityResolver roomSlug={roomId} />;
}
