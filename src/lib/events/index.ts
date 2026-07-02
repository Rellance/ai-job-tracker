import type { ActivityType, Prisma } from "@prisma/client";

import { db } from "@/lib/db";

/**
 * Single chokepoint for writing to the append-only ActivityEvent stream.
 * Powers the Audit Log, Activity Feed, and analytics timing. Never write to
 * the table directly from a service — always go through here.
 */
export async function emitActivity(
  userId: string,
  type: ActivityType,
  opts?: {
    entityType?: string;
    entityId?: string;
    metadata?: Prisma.InputJsonValue;
  },
) {
  await db.activityEvent.create({
    data: {
      userId,
      type,
      entityType: opts?.entityType ?? null,
      entityId: opts?.entityId ?? null,
      metadata: opts?.metadata,
    },
  });
}
