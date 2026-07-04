"use server";

import { revalidatePath } from "next/cache";

import { requireUserId } from "@/lib/auth/session";
import { deleteResume, setDefaultResume } from "@/lib/services/resume";

type Result = { ok: true } | { ok: false; error: string };

export async function setDefaultResumeAction(id: string): Promise<Result> {
  const userId = await requireUserId();
  const res = await setDefaultResume(userId, id);
  if (!res) return { ok: false, error: "Resume not found" };
  revalidatePath("/resumes");
  return { ok: true };
}

export async function deleteResumeAction(id: string): Promise<Result> {
  const userId = await requireUserId();
  const res = await deleteResume(userId, id);
  if (!res) return { ok: false, error: "Resume not found" };
  revalidatePath("/resumes");
  return { ok: true };
}
