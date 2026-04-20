"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

function normalizeUsername(value: string): string {
  return value.trim().replace(/\s+/g, "_").replace(/[^A-Za-z0-9_-]/g, "").slice(0, 24);
}

export async function updateProfileSettings(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const rawUsername = String(formData.get("username") ?? "");
  const username = normalizeUsername(rawUsername);

  if (username.length < 3) {
    redirect("/settings?error=Pseudo%20invalide%20(3-24%20caract%C3%A8res).");
  }

  const existing = await prisma.profile.findFirst({
    where: {
      username,
      id: { not: user.id },
    },
    select: { id: true },
  });

  if (existing) {
    redirect("/settings?error=Ce%20pseudo%20est%20d%C3%A9j%C3%A0%20pris.");
  }

  await prisma.profile.upsert({
    where: { id: user.id },
    update: { username },
    create: { id: user.id, username },
  });

  revalidatePath("/", "layout");
  revalidatePath("/my-brackets");
  revalidatePath("/settings");
  redirect("/settings?success=1");
}
