import { RoomApprovalsList } from "@/components/approvals";
import { RoomNotFound } from "@/components/rooms/room-not-found";
import { getRoomBySlug } from "@/lib/mock-data";

export default async function RoomApprovalsPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params;
  const room = getRoomBySlug(roomId);
  if (!room) return <RoomNotFound />;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">{room.name}</p>
        <h1 className="mt-2 text-3xl font-semibold">Approval center</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
          High-risk actions are never executed automatically. Approve and deny controls stay local in the MVP.
        </p>
      </div>
      <RoomApprovalsList roomId={room.id} />
    </div>
  );
}
