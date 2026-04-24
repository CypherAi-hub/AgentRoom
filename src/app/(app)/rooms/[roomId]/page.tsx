import { notFound } from "next/navigation";
import { RoomConsole } from "@/components/console";
import { getRoomBySlug } from "@/lib/mock-data";

export default async function RoomDetailPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params;
  const room = getRoomBySlug(roomId);
  if (!room) notFound();

  return <RoomConsole room={room} />;
}
