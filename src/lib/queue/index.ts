import { Queue } from "bullmq";
import IORedis from "ioredis";

import { env } from "@/lib/env";

/**
 * BullMQ wiring (System Design §5). One shared ioredis connection per
 * process; `maxRetriesPerRequest: null` is required by BullMQ.
 */
const globalForQueue = globalThis as unknown as {
  redis?: IORedis;
  aiRunsQueue?: Queue;
};

export function redisConnection(): IORedis {
  if (!env.REDIS_URL) {
    throw new Error("REDIS_URL is not set — background jobs need Redis");
  }
  globalForQueue.redis ??= new IORedis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
  });
  return globalForQueue.redis;
}

export const AI_RUNS_QUEUE = "ai-runs";

export function aiRunsQueue(): Queue {
  globalForQueue.aiRunsQueue ??= new Queue(AI_RUNS_QUEUE, {
    connection: redisConnection(),
    defaultJobOptions: {
      attempts: 2,
      backoff: { type: "exponential", delay: 3000 },
      removeOnComplete: 100,
      removeOnFail: 500,
    },
  });
  return globalForQueue.aiRunsQueue;
}

export async function enqueueAiRun(artifactId: string) {
  await aiRunsQueue().add("run", { artifactId });
}
