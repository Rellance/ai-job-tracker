import "dotenv/config";

import { Queue, Worker } from "bullmq";

import {
  AI_RUNS_QUEUE,
  REMINDERS_QUEUE,
  RESUME_PARSE_QUEUE,
  redisConnection,
} from "@/lib/queue";
import { processAiRun } from "@/lib/services/aiArtifact";
import { generateDueReminders } from "@/lib/services/notification";
import { processResumeParse } from "@/lib/services/resume";

/**
 * Dedicated worker process (System Design §2/§5): consumes BullMQ queues.
 * Run with `npm run worker`. Shares the codebase/services with the web app.
 */
const connection = redisConnection();

const aiWorker = new Worker(
  AI_RUNS_QUEUE,
  async (job) => {
    const { artifactId } = job.data as { artifactId: string };
    console.log(`[ai-runs] ${job.id} → artifact ${artifactId}`);
    await processAiRun(artifactId);
  },
  { connection, concurrency: 2 }, // protect OpenAI rate limits + Upstash budget
);

const parseWorker = new Worker(
  RESUME_PARSE_QUEUE,
  async (job) => {
    const { resumeId } = job.data as { resumeId: string };
    console.log(`[resume-parse] ${job.id} → resume ${resumeId}`);
    await processResumeParse(resumeId);
  },
  { connection, concurrency: 2 },
);

// Repeatable reminder scan (System Design §5): every minute, promote due
// interview reminders to in-app notifications across all users.
const remindersQueue = new Queue(REMINDERS_QUEUE, { connection });
const remindersWorker = new Worker(
  REMINDERS_QUEUE,
  async () => {
    await generateDueReminders();
  },
  { connection, concurrency: 1 },
);

async function scheduleReminders() {
  await remindersQueue.upsertJobScheduler(
    "reminders-scan",
    { every: 60_000 },
    { name: "scan" },
  );
}

for (const [name, w] of [
  ["ai-runs", aiWorker],
  ["resume-parse", parseWorker],
  ["reminders", remindersWorker],
] as const) {
  w.on("completed", (job) => console.log(`[${name}] ${job.id} completed`));
  w.on("failed", (job, err) =>
    console.error(`[${name}] ${job?.id} failed: ${err.message}`),
  );
}

scheduleReminders()
  .then(() =>
    console.log(
      "Worker up — consuming:",
      [AI_RUNS_QUEUE, RESUME_PARSE_QUEUE, REMINDERS_QUEUE].join(", "),
    ),
  )
  .catch((e) => {
    console.error("Failed to schedule reminders:", e);
    process.exit(1);
  });

async function shutdown() {
  console.log("Worker shutting down…");
  await Promise.all([
    aiWorker.close(),
    parseWorker.close(),
    remindersWorker.close(),
    remindersQueue.close(),
  ]);
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
