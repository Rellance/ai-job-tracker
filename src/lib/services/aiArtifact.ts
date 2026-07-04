import { createHash } from "crypto";

import { Prisma, type AiArtifactKind } from "@prisma/client";

import { db } from "@/lib/db";
import { emitActivity } from "@/lib/events";
import { runStructured } from "@/lib/ai/run";
import { TOOLS, type ToolKind } from "@/lib/ai/schemas";
import { consumeCredit } from "@/lib/services/quota";

export function computeInputHash(
  kind: string,
  input: Record<string, unknown>,
): string {
  const normalized = JSON.stringify(input, Object.keys(input).sort());
  return createHash("sha256").update(`${kind}:${normalized}`).digest("hex");
}

/**
 * Returns an existing artifact on a cache hit (same user + same input),
 * otherwise creates a PENDING one for the worker to pick up.
 */
export async function createOrReuseArtifact(
  userId: string,
  kind: ToolKind,
  input: Record<string, unknown>,
): Promise<{ id: string; status: string; cached: boolean }> {
  const inputHash = computeInputHash(kind, input);

  const existing = await db.aiArtifact.findUnique({
    where: { userId_inputHash: { userId, inputHash } },
  });
  if (existing && existing.status !== "FAILED") {
    return { id: existing.id, status: existing.status, cached: true };
  }
  if (existing) {
    // Previous attempt failed — allow a clean retry with the same input.
    await db.aiArtifact.delete({ where: { id: existing.id } });
  }

  const applicationId =
    typeof input.applicationId === "string" && input.applicationId
      ? input.applicationId
      : null;

  // Never attach to an application the user doesn't own.
  const ownedApplicationId = applicationId
    ? ((
        await db.application.findFirst({
          where: { id: applicationId, userId },
          select: { id: true },
        })
      )?.id ?? null)
    : null;

  try {
    const artifact = await db.aiArtifact.create({
      data: {
        userId,
        kind: kind as AiArtifactKind,
        status: "PENDING",
        applicationId: ownedApplicationId,
        input: input as Prisma.InputJsonObject,
        inputHash,
      },
    });
    return { id: artifact.id, status: "PENDING", cached: false };
  } catch (e) {
    // Unique race: another request created it between our check and insert.
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      const winner = await db.aiArtifact.findUnique({
        where: { userId_inputHash: { userId, inputHash } },
      });
      if (winner) return { id: winner.id, status: winner.status, cached: true };
    }
    throw e;
  }
}

export async function getArtifact(userId: string, id: string) {
  return db.aiArtifact.findFirst({ where: { id, userId } });
}

export async function listArtifacts(userId: string, take = 20) {
  return db.aiArtifact.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take,
    include: {
      application: { select: { id: true, company: true, title: true } },
    },
  });
}

export async function attachArtifact(
  userId: string,
  artifactId: string,
  applicationId: string,
) {
  const [artifact, app] = await Promise.all([
    db.aiArtifact.findFirst({ where: { id: artifactId, userId } }),
    db.application.findFirst({ where: { id: applicationId, userId } }),
  ]);
  if (!artifact || !app) return null;
  return db.aiArtifact.update({
    where: { id: artifactId },
    data: { applicationId },
  });
}

/**
 * Worker-side execution of one queued AI run (System Design §5-6).
 * Failure marks the artifact FAILED and does NOT consume quota.
 */
export async function processAiRun(artifactId: string) {
  const artifact = await db.aiArtifact.findUnique({
    where: { id: artifactId },
  });
  if (!artifact) return; // deleted meanwhile
  if (artifact.status === "COMPLETE") return; // redelivered job — idempotent

  const kind = artifact.kind as ToolKind;
  if (!(kind in TOOLS)) {
    await db.aiArtifact.update({
      where: { id: artifactId },
      data: { status: "FAILED", errorMessage: "Unsupported tool" },
    });
    return;
  }

  await db.aiArtifact.update({
    where: { id: artifactId },
    data: { status: "RUNNING", errorMessage: null },
  });

  try {
    const run = await runStructured(
      kind,
      artifact.input as Record<string, unknown>,
    );

    await db.aiArtifact.update({
      where: { id: artifactId },
      data: {
        status: "COMPLETE",
        result: run.result as Prisma.InputJsonValue,
        model: run.model,
        tokensIn: run.tokensIn,
        tokensOut: run.tokensOut,
        costCents: run.costCents,
      },
    });
    await consumeCredit(artifact.userId);
    await emitActivity(artifact.userId, "AI_GENERATED", {
      entityType: "AiArtifact",
      entityId: artifactId,
      metadata: { kind, model: run.model },
    });
    await db.notification.createMany({
      skipDuplicates: true,
      data: [
        {
          userId: artifact.userId,
          type: "AI_READY",
          title: `${TOOLS[kind].label} is ready`,
          entityType: "AiArtifact",
          entityId: artifactId,
        },
      ],
    });
  } catch (e) {
    const message = friendlyAiError(e);
    await db.aiArtifact.update({
      where: { id: artifactId },
      data: { status: "FAILED", errorMessage: message },
    });
    throw e; // let BullMQ record the failure/retries
  }
}

function friendlyAiError(e: unknown): string {
  const code =
    typeof e === "object" && e !== null
      ? String(
          (e as { code?: unknown }).code ??
            (e as { type?: unknown }).type ??
            "",
        )
      : "";
  const raw = e instanceof Error ? e.message : String(e);

  if (code === "insufficient_quota" || raw.includes("insufficient_quota")) {
    return "The OpenAI account has no credits. Add billing at platform.openai.com and retry.";
  }
  if (code === "rate_limit_exceeded" || raw.includes("rate limit")) {
    return "The AI service is rate-limited right now — try again in a minute.";
  }
  if (code === "invalid_api_key" || raw.includes("Incorrect API key")) {
    return "The OpenAI API key is invalid — check OPENAI_API_KEY.";
  }
  return "The AI service couldn't complete this run. Your credit was not used — retry.";
}
