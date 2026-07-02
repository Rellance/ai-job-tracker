import { ApplicationStatus } from "@prisma/client";

import { STATUS_META, type BoardColumn } from "@/lib/applications/meta";
import { db } from "@/lib/db";

export async function getDashboardData(userId: string) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    total,
    thisMonth,
    statusGroups,
    interviewsScheduled,
    recentEvents,
    dates,
  ] = await Promise.all([
    db.application.count({ where: { userId } }),
    db.application.count({
      where: { userId, createdAt: { gte: startOfMonth } },
    }),
    db.application.groupBy({
      by: ["status"],
      where: { userId },
      _count: true,
    }),
    db.interview.count({
      where: { userId, status: "SCHEDULED", scheduledAt: { gte: now } },
    }),
    db.activityEvent.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
    db.application.findMany({
      where: { userId },
      select: { createdAt: true, appliedAt: true },
    }),
  ]);

  const byStatus = (s: ApplicationStatus) =>
    statusGroups.find((g) => g.status === s)?._count ?? 0;

  const offers = byStatus("OFFER") + byStatus("ACCEPTED");
  const rejections = byStatus("REJECTED");
  const wishlist = byStatus("WISHLIST");
  const nonWishlist = total - wishlist;
  const successRate =
    nonWishlist > 0 ? Math.round((offers / nonWishlist) * 100) : 0;

  // Distribution collapsed into the 5 board columns
  const columnCounts: Record<BoardColumn, number> = {
    WISHLIST: 0,
    APPLIED: 0,
    INTERVIEW: 0,
    OFFER: 0,
    REJECTED: 0,
  };
  for (const g of statusGroups) {
    columnCounts[STATUS_META[g.status].column] += g._count;
  }
  const distribution = (Object.keys(columnCounts) as BoardColumn[])
    .map((column) => ({ column, count: columnCounts[column] }))
    .filter((d) => d.count > 0);

  // Funnel (approximated from current status)
  const interviewStages: ApplicationStatus[] = [
    "SCREENING",
    "INTERVIEW",
    "TECHNICAL_INTERVIEW",
    "FINAL_INTERVIEW",
    "OFFER",
    "ACCEPTED",
  ];
  const funnel = [
    { stage: "Applied", count: nonWishlist },
    {
      stage: "Interview",
      count: interviewStages.reduce((n, s) => n + byStatus(s), 0),
    },
    { stage: "Offer", count: offers },
  ];

  // Applications over the last 6 months
  const months: { key: string; month: string; count: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      key: `${d.getFullYear()}-${d.getMonth()}`,
      month: d.toLocaleString("en-US", { month: "short" }),
      count: 0,
    });
  }
  const monthIndex = new Map(months.map((m, i) => [m.key, i]));
  for (const a of dates) {
    const d = new Date(a.appliedAt ?? a.createdAt);
    const idx = monthIndex.get(`${d.getFullYear()}-${d.getMonth()}`);
    if (idx !== undefined) {
      const bucket = months[idx];
      if (bucket) bucket.count += 1;
    }
  }

  return {
    stats: {
      total,
      thisMonth,
      interviewsScheduled,
      rejections,
      offers,
      successRate,
    },
    distribution,
    funnel,
    overTime: months.map((m) => ({ month: m.month, count: m.count })),
    recentEvents,
    hasData: total > 0,
  };
}

export type DashboardData = Awaited<ReturnType<typeof getDashboardData>>;
