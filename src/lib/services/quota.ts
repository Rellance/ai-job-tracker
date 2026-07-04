import { Plan } from "@prisma/client";

import { db } from "@/lib/db";

/** Monthly AI-action allowance per plan (PRD §11). null = unlimited. */
export const PLAN_LIMITS: Record<Plan, number | null> = {
  FREE: 10,
  PRO: null,
  ENTERPRISE: null,
};

function nextResetDue(anchor: Date): boolean {
  const due = new Date(anchor);
  due.setMonth(due.getMonth() + 1);
  return new Date() >= due;
}

export type QuotaState = {
  plan: Plan;
  used: number;
  limit: number | null;
  remaining: number | null;
  allowed: boolean;
};

/** Reads (and lazily resets) the user's monthly AI quota. */
export async function getQuota(userId: string): Promise<QuotaState> {
  let user = await db.user.findUniqueOrThrow({
    where: { id: userId },
    select: { plan: true, aiCreditsUsed: true, aiCreditsReset: true },
  });

  if (nextResetDue(user.aiCreditsReset)) {
    user = await db.user.update({
      where: { id: userId },
      data: { aiCreditsUsed: 0, aiCreditsReset: new Date() },
      select: { plan: true, aiCreditsUsed: true, aiCreditsReset: true },
    });
  }

  const limit = PLAN_LIMITS[user.plan];
  const remaining =
    limit === null ? null : Math.max(0, limit - user.aiCreditsUsed);
  return {
    plan: user.plan,
    used: user.aiCreditsUsed,
    limit,
    remaining,
    allowed: limit === null || user.aiCreditsUsed < limit,
  };
}

/** Consumed only on successful runs — failed jobs are free (PRD E6). */
export async function consumeCredit(userId: string) {
  await db.user.update({
    where: { id: userId },
    data: { aiCreditsUsed: { increment: 1 } },
  });
}
