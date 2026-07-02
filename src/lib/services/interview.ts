import { db } from "@/lib/db";
import { emitActivity } from "@/lib/events";
import type {
  InterviewCreateInput,
  InterviewUpdateInput,
} from "@/lib/validations/interview";

export async function listInterviewsForRange(
  userId: string,
  start: Date,
  end: Date,
) {
  return db.interview.findMany({
    where: { userId, scheduledAt: { gte: start, lte: end } },
    orderBy: { scheduledAt: "asc" },
    include: {
      application: { select: { id: true, company: true, title: true } },
    },
  });
}

export type CalendarInterview = Awaited<
  ReturnType<typeof listInterviewsForRange>
>[number];

export async function createInterview(
  userId: string,
  input: InterviewCreateInput,
) {
  const app = await db.application.findFirst({
    where: { id: input.applicationId, userId },
    select: { id: true },
  });
  if (!app) return null;

  const { reminderMinutesBefore, ...data } = input;
  const reminderAt =
    reminderMinutesBefore > 0
      ? new Date(data.scheduledAt.getTime() - reminderMinutesBefore * 60_000)
      : null;

  const interview = await db.interview.create({
    data: { ...data, reminderAt, userId },
  });
  await emitActivity(userId, "INTERVIEW_SCHEDULED", {
    entityType: "Interview",
    entityId: interview.id,
    metadata: { applicationId: input.applicationId, type: input.type },
  });
  return interview;
}

export async function updateInterview(
  userId: string,
  id: string,
  input: InterviewUpdateInput,
) {
  const existing = await db.interview.findFirst({ where: { id, userId } });
  if (!existing) return null;

  const interview = await db.interview.update({ where: { id }, data: input });
  await emitActivity(userId, "INTERVIEW_UPDATED", {
    entityType: "Interview",
    entityId: id,
    metadata: input.status ? { status: input.status } : undefined,
  });
  return interview;
}

export async function deleteInterview(userId: string, id: string) {
  const existing = await db.interview.findFirst({ where: { id, userId } });
  if (!existing) return null;
  await db.interview.delete({ where: { id } });
  return existing;
}
