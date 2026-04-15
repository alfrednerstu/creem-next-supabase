"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface ProfileActionState {
  error?: string;
  info?: string;
}

export async function updateProfile(
  _prev: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const fullName = String(formData.get("full_name") ?? "").trim();

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  // supabase.from types are `never` without a generated Database type —
  // the runtime call is safe, so cast through unknown.
  const table = supabase.from("profiles") as unknown as {
    update: (row: Record<string, unknown>) => {
      eq: (col: string, val: string) => Promise<{ error: { message: string } | null }>;
    };
  };
  const { error } = await table.update({ full_name: fullName || null }).eq("id", user.id);
  if (error) return { error: error.message };

  revalidatePath("/settings");
  return { info: "Profile updated." };
}
