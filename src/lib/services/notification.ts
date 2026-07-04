import { db } from "@/lib/db";
import { INTERVIEW_TYPE_LABEL } from "@/lib/validations/interview";

/**
 * Generates due interview reminders as in-app notifications.
 *
 * Primary path: the BullMQ repeatable `reminders` job in the worker calls
 * this without a userId (global scan, System Design §5). The per-user call
 * on notification load is kept as an idempotent fallback so reminders still
 * work when the worker isn't running (e.g. `npm run dev` alone).
 */
export async function generateDueReminders(userId?: string) {
  const now = new Date();
  const due = await db.interview.findMany({
    where: {
      ...(userId ? { userId } : {}),
      status: "SCHEDULED",
      reminderAt: { lte: now },
      scheduledAt: { gte: now },
    },
    include: { application: { select: { company: true } } },
  });
  if (due.length === 0) return;

  const existing = await db.notification.findMany({
    where: {
      type: "REMINDER",
      entityType: "Interview",
      entityId: { in: due.map((d) => d.id) },
    },
    select: { entityId: true },
  });
  const already = new Set(existing.map((e) => e.entityId));

  const fresh = due.filter((d) => !already.has(d.id));
  if (fresh.length === 0) return;

  await db.notification.createMany({
    skipDuplicates: true, // + DB unique constraint guards concurrent renders
    data: fresh.map((iv) => ({
      userId: iv.userId, // reminder goes to the interview's owner
      type: "REMINDER" as const,
      title: `Upcoming: ${INTERVIEW_TYPE_LABEL[iv.type]} — ${iv.application.company}`,
      body: iv.scheduledAt.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }),
      entityType: "Interview",
      entityId: iv.id,
    })),
  });
}

export async function getNotifications(userId: string) {
  await generateDueReminders(userId);
  const [items, unread] = await Promise.all([
    db.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
    db.notification.count({ where: { userId, readAt: null } }),
  ]);
  return { items, unread };
}

export type NotificationsPayload = Awaited<ReturnType<typeof getNotifications>>;

export async function markAllRead(userId: string) {
  await db.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
}
