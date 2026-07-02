"use client";

import Link from "next/link";
import { useState } from "react";
import { InterviewType } from "@prisma/client";
import { CalendarClock, ChevronLeft, ChevronRight } from "lucide-react";

import {
  InterviewForm,
  type ApplicationOption,
} from "@/components/interviews/interview-form";
import { Button, buttonVariants } from "@/components/ui/button";
import { INTERVIEW_TYPE_LABEL } from "@/lib/validations/interview";
import { cn } from "@/lib/utils";

export type CalendarEvent = {
  id: string;
  applicationId: string;
  company: string;
  title: string;
  type: InterviewType;
  scheduledAt: string; // ISO
  status: string;
};

const TYPE_DOT: Record<InterviewType, string> = {
  PHONE_SCREEN: "bg-status-applied",
  TECHNICAL: "bg-status-interview",
  BEHAVIORAL: "bg-chart-3",
  FINAL: "bg-status-offer",
  FOLLOW_UP: "bg-status-wishlist",
};

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function CalendarView({
  year,
  month, // 0-based
  events,
  applications,
}: {
  year: number;
  month: number;
  events: CalendarEvent[];
  applications: ApplicationOption[];
}) {
  const [quickAddDate, setQuickAddDate] = useState<Date | null>(null);

  const first = new Date(year, month, 1);
  const today = new Date();
  const monthLabel = first.toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });

  // Build a 6x7 grid starting Monday
  const startOffset = (first.getDay() + 6) % 7;
  const gridStart = new Date(year, month, 1 - startOffset);
  const cells: Date[] = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    return d;
  });

  const prev = monthKey(new Date(year, month - 1, 1));
  const next = monthKey(new Date(year, month + 1, 1));

  const eventsOf = (day: Date) =>
    events.filter((e) => sameDay(new Date(e.scheduledAt), day));

  const upcoming = events
    .filter((e) => new Date(e.scheduledAt) >= today)
    .slice(0, 8);

  return (
    <div className="grid gap-6 lg:grid-cols-4">
      <div className="lg:col-span-3">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-medium">{monthLabel}</h2>
          <div className="flex items-center gap-1">
            <Link
              aria-label="Previous month"
              href={`/calendar?month=${prev}`}
              className={buttonVariants({ variant: "ghost", size: "icon" })}
            >
              <ChevronLeft className="size-4" />
            </Link>
            <Link
              href="/calendar"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Today
            </Link>
            <Link
              aria-label="Next month"
              href={`/calendar?month=${next}`}
              className={buttonVariants({ variant: "ghost", size: "icon" })}
            >
              <ChevronRight className="size-4" />
            </Link>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border">
          <div className="bg-muted/50 grid grid-cols-7 border-b text-center">
            {WEEKDAYS.map((d) => (
              <div
                key={d}
                className="text-muted-foreground py-1.5 text-xs font-medium"
              >
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {cells.map((day, i) => {
              const inMonth = day.getMonth() === month;
              const isToday = sameDay(day, today);
              const dayEvents = eventsOf(day);
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => setQuickAddDate(day)}
                  className={cn(
                    "hover:bg-accent/40 relative flex min-h-24 flex-col items-stretch border-b border-l p-1.5 text-left align-top transition-colors first:border-l-0 [&:nth-child(7n+1)]:border-l-0",
                    !inMonth && "bg-muted/30 text-muted-foreground/50",
                  )}
                  aria-label={`Add interview on ${day.toDateString()}`}
                >
                  <span
                    className={cn(
                      "mb-1 inline-flex size-6 items-center justify-center rounded-full text-xs",
                      isToday &&
                        "bg-primary text-primary-foreground font-semibold",
                    )}
                  >
                    {day.getDate()}
                  </span>
                  <span className="space-y-1">
                    {dayEvents.slice(0, 3).map((e) => (
                      <Link
                        key={e.id}
                        href={`/applications/${e.applicationId}`}
                        onClick={(ev) => ev.stopPropagation()}
                        className="bg-card hover:bg-accent block truncate rounded border px-1 py-0.5 text-[10px]"
                      >
                        <span
                          className={cn(
                            "mr-1 inline-block size-1.5 rounded-full",
                            TYPE_DOT[e.type],
                          )}
                        />
                        {new Date(e.scheduledAt).toLocaleTimeString("en-US", {
                          hour: "numeric",
                          minute: "2-digit",
                        })}{" "}
                        {e.company}
                      </Link>
                    ))}
                    {dayEvents.length > 3 && (
                      <span className="text-muted-foreground block px-1 text-[10px]">
                        +{dayEvents.length - 3} more
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        <p className="text-muted-foreground mt-2 text-xs">
          Click a day to schedule an interview · click an event to open its
          application.
        </p>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Upcoming</h3>
          <InterviewForm
            applications={applications}
            trigger={<Button size="sm">Schedule</Button>}
          />
        </div>
        {upcoming.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Nothing scheduled this month.
          </p>
        ) : (
          <ul className="space-y-2">
            {upcoming.map((e) => (
              <li key={e.id}>
                <Link
                  href={`/applications/${e.applicationId}`}
                  className="hover:bg-accent/40 block rounded-lg border p-3 transition-colors"
                >
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <span
                      className={cn("size-2 rounded-full", TYPE_DOT[e.type])}
                    />
                    {e.company}
                  </div>
                  <div className="text-muted-foreground mt-0.5 text-xs">
                    {INTERVIEW_TYPE_LABEL[e.type]} ·{" "}
                    <CalendarClock className="mr-0.5 inline size-3" />
                    {new Date(e.scheduledAt).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {quickAddDate && (
        <InterviewForm
          applications={applications}
          defaultDate={quickAddDate}
          open
          onOpenChange={(o) => !o && setQuickAddDate(null)}
        />
      )}
    </div>
  );
}
