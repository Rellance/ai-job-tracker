import type { Metadata } from "next";

import {
  CalendarView,
  type CalendarEvent,
} from "@/components/calendar/calendar-view";
import { requireUserId } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { listInterviewsForRange } from "@/lib/services/interview";

export const metadata: Metadata = { title: "Calendar" };

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const userId = await requireUserId();
  const { month: monthParam } = await searchParams;

  const now = new Date();
  let year = now.getFullYear();
  let month = now.getMonth();
  const m = monthParam?.match(/^(\d{4})-(\d{2})$/);
  if (m?.[1] && m[2]) {
    year = Number(m[1]);
    month = Number(m[2]) - 1;
  }

  // Range covers the whole visible 6-week grid
  const start = new Date(year, month, -7);
  const end = new Date(year, month + 1, 8);

  const [interviews, applications] = await Promise.all([
    listInterviewsForRange(userId, start, end),
    db.application.findMany({
      where: { userId },
      select: { id: true, company: true, title: true },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  const events: CalendarEvent[] = interviews.map((iv) => ({
    id: iv.id,
    applicationId: iv.application.id,
    company: iv.application.company,
    title: iv.application.title,
    type: iv.type,
    scheduledAt: iv.scheduledAt.toISOString(),
    status: iv.status,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Calendar
        </h1>
        <p className="text-muted-foreground text-sm">
          Interviews, follow-ups, and reminders.
        </p>
      </div>
      <CalendarView
        year={year}
        month={month}
        events={events}
        applications={applications}
      />
    </div>
  );
}
