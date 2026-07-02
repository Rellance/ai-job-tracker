"use server";

import { revalidatePath } from "next/cache";

import { requireUserId } from "@/lib/auth/session";
import * as interviewService from "@/lib/services/interview";
import {
  interviewCreateSchema,
  interviewUpdateSchema,
} from "@/lib/validations/interview";

type ActionResult = { ok: true; id?: string } | { ok: false; error: string };

function revalidate(applicationId?: string) {
  revalidatePath("/calendar");
  revalidatePath("/dashboard");
  revalidatePath("/applications");
  if (applicationId) revalidatePath(`/applications/${applicationId}`);
}

export async function createInterviewAction(
  values: unknown,
): Promise<ActionResult> {
  const userId = await requireUserId();
  const parsed = interviewCreateSchema.safeParse(values);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }
  const interview = await interviewService.createInterview(userId, parsed.data);
  if (!interview) return { ok: false, error: "Application not found" };
  revalidate(parsed.data.applicationId);
  return { ok: true, id: interview.id };
}

export async function updateInterviewAction(
  id: string,
  values: unknown,
): Promise<ActionResult> {
  const userId = await requireUserId();
  const parsed = interviewUpdateSchema.safeParse(values);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }
  const interview = await interviewService.updateInterview(
    userId,
    id,
    parsed.data,
  );
  if (!interview) return { ok: false, error: "Interview not found" };
  revalidate(interview.applicationId);
  return { ok: true, id };
}

export async function deleteInterviewAction(id: string): Promise<ActionResult> {
  const userId = await requireUserId();
  const res = await interviewService.deleteInterview(userId, id);
  if (!res) return { ok: false, error: "Interview not found" };
  revalidate(res.applicationId);
  return { ok: true };
}
