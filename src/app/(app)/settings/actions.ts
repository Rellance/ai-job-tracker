"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { requireUserId } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { passwordSchema } from "@/lib/validations/auth";

type Result = { ok: true; message?: string } | { ok: false; error: string };

const profileSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
});

export async function updateProfileAction(values: unknown): Promise<Result> {
  const userId = await requireUserId();
  const parsed = profileSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  }
  await db.user.update({
    where: { id: userId },
    data: { name: parsed.data.name },
  });
  revalidatePath("/settings");
  revalidatePath("/", "layout");
  return { ok: true, message: "Profile updated" };
}

const changePasswordSchema = z.object({
  current: z.string().min(1, "Enter your current password"),
  next: passwordSchema,
});

export async function changePasswordAction(values: unknown): Promise<Result> {
  const userId = await requireUserId();
  const parsed = changePasswordSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  }

  const user = await db.user.findUniqueOrThrow({
    where: { id: userId },
    select: { hashedPassword: true },
  });
  if (
    !user.hashedPassword ||
    !(await verifyPassword(parsed.data.current, user.hashedPassword))
  ) {
    return { ok: false, error: "Current password is incorrect" };
  }

  await db.user.update({
    where: { id: userId },
    data: { hashedPassword: await hashPassword(parsed.data.next) },
  });
  return { ok: true, message: "Password changed" };
}
