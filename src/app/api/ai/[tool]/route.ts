import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { toolBySlug } from "@/lib/ai/schemas";
import { enqueueAiRun } from "@/lib/queue";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { createOrReuseArtifact } from "@/lib/services/aiArtifact";
import { getQuota } from "@/lib/services/quota";

/**
 * POST /api/ai/{analyze-jd|resume-gap|match-score|cover-letter|interview-prep|optimize-resume}
 * Auth → validate → quota gate → inputHash cache → PENDING artifact → enqueue → 202.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ tool: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Sign in required" } },
      { status: 401 },
    );
  }
  const userId = session.user.id;

  // Burst protection on top of the monthly quota (System Design §9)
  const rl = await rateLimit(`ai:${userId}`, 10, 60);
  if (!rl.allowed) return tooManyRequests(rl.retryAfterSec);

  const { tool: slug } = await params;
  const tool = toolBySlug(slug);
  if (!tool) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Unknown AI tool" } },
      { status: 404 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "Invalid JSON body" } },
      { status: 400 },
    );
  }

  const parsed = tool.input.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION",
          message: parsed.error.issues[0]?.message ?? "Invalid input",
        },
      },
      { status: 400 },
    );
  }

  const quota = await getQuota(userId);
  if (!quota.allowed) {
    return NextResponse.json(
      {
        error: {
          code: "QUOTA_EXCEEDED",
          message: `You've used all ${quota.limit} free AI actions this month. Upgrade to keep going.`,
        },
      },
      { status: 402 },
    );
  }

  const artifact = await createOrReuseArtifact(
    userId,
    tool.kind,
    parsed.data as Record<string, unknown>,
  );
  if (!artifact.cached) {
    await enqueueAiRun(artifact.id);
  }

  return NextResponse.json(
    { id: artifact.id, status: artifact.status, cached: artifact.cached },
    { status: artifact.cached ? 200 : 202 },
  );
}
