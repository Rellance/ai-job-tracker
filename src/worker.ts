import "dotenv/config";

import { Worker } from "bullmq";

import { AI_RUNS_QUEUE, redisConnection } from "@/lib/queue";
import { processAiRun } from "@/lib/services/aiArtifact";

/**
 * Dedicated worker process (System Design §2/§5): consumes BullMQ queues.
 * Run with `npm run worker`. Shares the codebase/services with the web app.
 */
const aiWorker = new Worker(
  AI_RUNS_QUEUE,
  async (job) => {
    const { artifactId } = job.data as { artifactId: string };
    console.log(`[ai-runs] ${job.id} → artifact ${artifactId}`);
    await processAiRun(artifactId);
  },
  {
    connection: redisConnection(),
    concurrency: 2, // protect OpenAI rate limits + Upstash command budget
  },
);

aiWorker.on("completed", (job) => {
  console.log(`[ai-runs] ${job.id} completed`);
});
aiWorker.on("failed", (job, err) => {
  console.error(`[ai-runs] ${job?.id} failed: ${err.message}`);
});

console.log("Worker up — consuming:", AI_RUNS_QUEUE);

async function shutdown() {
  console.log("Worker shutting down…");
  await aiWorker.close();
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
