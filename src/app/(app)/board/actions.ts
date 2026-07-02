"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { COLUMN_DEFAULT_STATUS, STATUS_META } from "@/lib/applications/meta";
import { requireUserId } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { emitActivity } from "@/lib/events";

const moveSchema = z.object({
  applicationId: z.string().min(1),
  column: z.enum(["WISHLIST", "APPLIED", "INTERVIEW", "OFFER", "REJECTED"]),
  // ordered application ids of the destination column after the drop
  orderedIds: z.array(z.string()).max(500),
});

type Result = { ok: true } | { ok: false; error: string };

/**
 * Persists a Kanban drop: sets the moved application's status to the target
 * column's default (only when it actually changes column — a reorder within
 * the same column keeps the detailed status), and rewrites boardOrder for the
 * destination column in one transaction.
 */
export async function moveCardAction(values: unknown): Promise<Result> {
  const userId = await requireUserId();
  const parsed = moveSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: "Invalid move" };

  const { applicationId, column, orderedIds } = parsed.data;

  const app = await db.application.findFirst({
    where: { id: applicationId, userId },
  });
  if (!app) return { ok: false, error: "Application not found" };

  const currentColumn = STATUS_META[app.status].column;
  const columnChanged = currentColumn !== column;
  const newStatus = columnChanged ? COLUMN_DEFAULT_STATUS[column] : app.status;

  // Only touch rows the user owns; ignore ids that aren't theirs.
  const owned = await db.application.findMany({
    where: { id: { in: orderedIds }, userId },
    select: { id: true },
  });
  const ownedSet = new Set(owned.map((o) => o.id));
  const finalOrder = orderedIds.filter((id) => ownedSet.has(id));

  await db.$transaction([
    db.application.update({
      where: { id: applicationId },
      data: { status: newStatus },
    }),
    ...finalOrder.map((id, index) =>
      db.application.update({
        where: { id },
        data: { boardOrder: index },
      }),
    ),
  ]);

  if (columnChanged) {
    await emitActivity(userId, "STATUS_CHANGED", {
      entityType: "Application",
      entityId: applicationId,
      metadata: { from: app.status, to: newStatus },
    });
  }

  revalidatePath("/board");
  revalidatePath("/applications");
  revalidatePath("/dashboard");
  return { ok: true };
}
