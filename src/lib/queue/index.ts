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
  resumeParseQueue?: Queue;
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
export const RESUME_PARSE_QUEUE = "resume-parse";
export const REMINDERS_QUEUE = "reminders";

const defaultJobOptions = {
  attempts: 2,
  backoff: { type: "exponential", delay: 3000 },
  removeOnComplete: 100,
  removeOnFail: 500,
} as const;

export function aiRunsQueue(): Queue {
  globalForQueue.aiRunsQueue ??= new Queue(AI_RUNS_QUEUE, {
    connection: redisConnection(),
    defaultJobOptions,
  });
  return globalForQueue.aiRunsQueue;
}

export async function enqueueAiRun(artifactId: string) {
  await aiRunsQueue().add("run", { artifactId });
}

export function resumeParseQueue(): Queue {
  globalForQueue.resumeParseQueue ??= new Queue(RESUME_PARSE_QUEUE, {
    connection: redisConnection(),
    defaultJobOptions: { ...defaultJobOptions, attempts: 3 },
  });
  return globalForQueue.resumeParseQueue;
}

export async function enqueueResumeParse(resumeId: string) {
  await resumeParseQueue().add("parse", { resumeId });
}
