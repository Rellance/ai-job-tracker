import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { redisConnection } from "@/lib/queue";

/** GET /api/health — liveness for container orchestration (System Design §12). */
export async function GET() {
  const checks: Record<string, "ok" | "fail" | "skipped"> = {
    db: "fail",
    redis: "skipped",
  };

  try {
    await db.$queryRaw`SELECT 1`;
    checks.db = "ok";
  } catch {
    /* stays fail */
  }

  if (env.REDIS_URL) {
    try {
      checks.redis = (await redisConnection().ping()) === "PONG" ? "ok" : "fail";
    } catch {
      checks.redis = "fail";
    }
  }

  const healthy = checks.db === "ok" && checks.redis !== "fail";
  return NextResponse.json(
    { status: healthy ? "ok" : "degraded", checks },
    { status: healthy ? 200 : 503 },
  );
}
