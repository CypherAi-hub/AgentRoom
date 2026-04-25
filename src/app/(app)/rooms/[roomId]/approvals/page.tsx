import { RoomApprovalsResolver } from "@/components/rooms/room-subpage-resolvers";

export default async function RoomApprovalsPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params;

  return <RoomApprovalsResolver roomSlug={roomId} />;
}
