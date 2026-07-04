"use server";

import { revalidatePath } from "next/cache";

import { requireUserId } from "@/lib/auth/session";
import { attachArtifact } from "@/lib/services/aiArtifact";

export async function attachArtifactAction(
  artifactId: string,
  applicationId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const userId = await requireUserId();
  const res = await attachArtifact(userId, artifactId, applicationId);
  if (!res) return { ok: false, error: "Artifact or application not found" };
  revalidatePath(`/applications/${applicationId}`);
  revalidatePath("/ai");
  return { ok: true };
}
