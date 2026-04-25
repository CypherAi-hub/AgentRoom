"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createRoom } from "@/lib/data/rooms";

export type CreateRoomState = { error: string | null };

export async function createRoomAction(_prev: CreateRoomState, formData: FormData): Promise<CreateRoomState> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in to create a room." };

  const nameValue = formData.get("name");
  const descValue = formData.get("description");
  const name = typeof nameValue === "string" ? nameValue.trim() : "";
  const description = typeof descValue === "string" ? descValue.trim() : "";

  if (!name) return { error: "Give your room a name." };
  if (name.length > 80) return { error: "Names should be 80 characters or fewer." };

  try {
    const room = await createRoom(user.id, { name, description: description || null });
    revalidatePath("/rooms");
    revalidatePath("/dashboard");
    redirect(`/rooms/${room.id}`);
  } catch (error) {
    if (error instanceof Error && error.message?.includes("NEXT_REDIRECT")) throw error;
    return { error: "Could not create room. Try again." };
  }
}
