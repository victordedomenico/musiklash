"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { migrateGuestDataToUser } from "@/lib/guest";

export async function signIn(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  if (data.user?.id) {
    await migrateGuestDataToUser(data.user.id);
  }

  revalidatePath("/", "layout");
  redirect("/my-brackets");
}

export async function signUp(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    return redirect(`/signup?error=${encodeURIComponent(error.message)}`);
  }

  if (data.user?.id) {
    await migrateGuestDataToUser(data.user.id);
  }

  revalidatePath("/", "layout");
  redirect("/my-brackets?welcome=1");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}

export async function updateGuestUsername(formData: FormData): Promise<void> {
  const raw = String(formData.get("username") ?? "");
  const { setGuestUsername } = await import("@/lib/guest");
  const result = await setGuestUsername(raw);
  if (!result.error) {
    revalidatePath("/", "layout");
  }
}
