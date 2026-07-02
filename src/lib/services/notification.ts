import { db } from "@/lib/db";
import { INTERVIEW_TYPE_LABEL } from "@/lib/validations/interview";

/**
 * Generates due interview reminders as in-app notifications.
 *
 * NOTE (M3 interim): this runs opportunistically when notifications are
 * loaded. In M4 it moves to the BullMQ repeatable `reminders` job in the
 * worker (System Design §5) — same logic, push instead of pull.
 * Idempotent: one REMINDER notification per interview.
 */
export async function generateDueReminders(userId: string) {
  const now = new Date();
  const due = await db.interview.findMany({
    where: {
      userId,
      status: "SCHEDULED",
      reminderAt: { lte: now },
      scheduledAt: { gte: now },
    },
    include: { application: { select: { company: true } } },
  });
  if (due.length === 0) return;

  const existing = await db.notification.findMany({
    where: {
      userId,
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
      userId,
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
