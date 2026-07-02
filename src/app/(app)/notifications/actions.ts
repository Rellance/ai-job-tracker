"use server";

import { revalidatePath } from "next/cache";

import { requireUserId } from "@/lib/auth/session";
import { markAllRead } from "@/lib/services/notification";

export async function markNotificationsReadAction() {
  const userId = await requireUserId();
  await markAllRead(userId);
  revalidatePath("/", "layout");
}
