import type { Metadata } from "next";
import { Calendar } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";

export const metadata: Metadata = { title: "Calendar" };

export default function CalendarPage() {
  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-semibold tracking-tight">
        Calendar
      </h1>
      <EmptyState
        icon={Calendar}
        title="Calendar coming in M3"
        description="Interviews, follow-ups, deadlines, and reminders in one place."
      />
    </div>
  );
}
