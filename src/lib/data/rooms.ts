import { mapRoom } from "@/lib/data/mappers";
import { getAdminClient, getAuthedClient } from "@/lib/data/clients";
import type { Room, RoomStatus } from "@/lib/data/types";

export async function getRooms(userId: string): Promise<Room[]> {
  const supabase = await getAuthedClient();
  const { data, error } = await supabase
    .from("rooms")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapRoom);
}

export async function getRoom(userId: string, roomId: string): Promise<Room | null> {
  const supabase = await getAuthedClient();
  const { data, error } = await supabase
    .from("rooms")
    .select("*")
    .eq("user_id", userId)
    .eq("id", roomId)
    .maybeSingle();
  if (error) throw error;
  return data ? mapRoom(data) : null;
}

export async function createRoom(
  userId: string,
  params: { name: string; description?: string | null },
): Promise<Room> {
  const supabase = await getAuthedClient();
  const { data, error } = await supabase
    .from("rooms")
    .insert({
      user_id: userId,
      name: params.name.trim(),
      description: params.description?.trim() || null,
    })
    .select("*")
    .single();
  if (error) throw error;
  return mapRoom(data);
}

export async function updateRoom(
  userId: string,
  roomId: string,
  patch: { name?: string; description?: string | null; status?: RoomStatus },
): Promise<Room> {
  const supabase = await getAuthedClient();
  const update: Record<string, unknown> = {};
  if (patch.name !== undefined) update.name = patch.name.trim();
  if (patch.description !== undefined) update.description = patch.description?.trim() || null;
  if (patch.status !== undefined) update.status = patch.status;
  const { data, error } = await supabase
    .from("rooms")
    .update(update)
    .eq("user_id", userId)
    .eq("id", roomId)
    .select("*")
    .single();
  if (error) throw error;
  return mapRoom(data);
}

export async function archiveRoom(userId: string, roomId: string): Promise<void> {
  await updateRoom(userId, roomId, { status: "archived" });
}

export async function ensureUserHasRoom(userId: string): Promise<Room> {
  const supabase = await getAdminClient();
  const { data: existing } = await supabase
    .from("rooms")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (existing) return mapRoom(existing);

  const { data: created, error } = await supabase
    .from("rooms")
    .insert({
      user_id: userId,
      name: "My First Room",
      description: "Your default workspace. Rename or create new rooms anytime.",
    })
    .select("*")
    .single();
  if (error) throw error;
  return mapRoom(created);
}
