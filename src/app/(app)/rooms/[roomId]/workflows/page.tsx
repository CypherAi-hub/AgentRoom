import { RoomWorkflowsResolver } from "@/components/rooms/room-subpage-resolvers";

export default async function RoomWorkflowsPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params;

  return <RoomWorkflowsResolver roomSlug={roomId} />;
}
