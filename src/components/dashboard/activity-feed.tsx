import { ApplicationStatus, type ActivityEvent } from "@prisma/client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { STATUS_META } from "@/lib/applications/meta";
import { formatRelative } from "@/lib/utils/format";

function statusLabel(v: unknown): string {
  if (typeof v === "string" && v in STATUS_META) {
    return STATUS_META[v as ApplicationStatus].label;
  }
  return String(v ?? "");
}

function describe(e: ActivityEvent): string {
  const m = (e.metadata ?? {}) as Record<string, unknown>;
  switch (e.type) {
    case "APPLICATION_CREATED":
      return `Added ${String(m.company ?? "an application")}`;
    case "APPLICATION_UPDATED":
      return "Updated an application";
    case "APPLICATION_DELETED":
      return `Deleted ${String(m.company ?? "an application")}`;
    case "STATUS_CHANGED":
      return `Status: ${statusLabel(m.from)} → ${statusLabel(m.to)}`;
    case "NOTE_ADDED":
      return "Added a note";
    case "INTERVIEW_SCHEDULED":
      return "Scheduled an interview";
    case "INTERVIEW_UPDATED":
      return "Updated an interview";
    case "RESUME_UPLOADED":
      return "Uploaded a resume";
    case "AI_GENERATED":
      return "Generated an AI insight";
    case "COVER_LETTER_SAVED":
      return "Saved a cover letter";
    case "USER_LOGIN":
      return "Signed in";
    case "PLAN_CHANGED":
      return "Changed plan";
    default:
      return e.type;
  }
}

export function ActivityFeed({ events }: { events: ActivityEvent[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Recent activity</CardTitle>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <p className="text-muted-foreground text-sm">No activity yet.</p>
        ) : (
          <ul className="space-y-3">
            {events.map((e) => (
              <li key={e.id} className="flex items-center gap-3 text-sm">
                <span className="bg-primary/60 size-1.5 shrink-0 rounded-full" />
                <span className="flex-1">{describe(e)}</span>
                <span className="text-muted-foreground text-xs whitespace-nowrap">
                  {formatRelative(e.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
