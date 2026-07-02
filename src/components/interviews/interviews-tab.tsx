"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Interview } from "@prisma/client";
import { CalendarClock, ExternalLink, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  deleteInterviewAction,
  updateInterviewAction,
} from "@/app/(app)/calendar/actions";
import { InterviewForm } from "@/components/interviews/interview-form";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { INTERVIEW_TYPE_LABEL } from "@/lib/validations/interview";

const statusItems = [
  { value: "SCHEDULED", label: "Scheduled" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "NO_SHOW", label: "No-show" },
];

export function InterviewsTab({
  applicationId,
  interviews,
}: {
  applicationId: string;
  interviews: Interview[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const setStatus = (id: string, status: string | null) => {
    if (!status) return;
    startTransition(async () => {
      const res = await updateInterviewAction(id, { status });
      if (!res.ok) toast.error(res.error);
      router.refresh();
    });
  };

  const remove = (id: string) =>
    startTransition(async () => {
      const res = await deleteInterviewAction(id);
      if (!res.ok) toast.error(res.error);
      router.refresh();
    });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <InterviewForm
          fixedApplicationId={applicationId}
          trigger={
            <Button size="sm">
              <Plus className="size-4" />
              Schedule interview
            </Button>
          }
        />
      </div>

      {interviews.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title="No interviews yet"
          description="Schedule one and it will show up here and on your calendar."
        />
      ) : (
        <ul className="space-y-2">
          {interviews.map((iv) => (
            <li
              key={iv.id}
              className="flex flex-wrap items-center gap-3 rounded-lg border p-3"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-sm font-medium">
                  {INTERVIEW_TYPE_LABEL[iv.type]}
                  {iv.meetingUrl && (
                    <a
                      href={iv.meetingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary inline-flex items-center gap-0.5 text-xs hover:underline"
                    >
                      Join <ExternalLink className="size-3" />
                    </a>
                  )}
                </div>
                <p className="text-muted-foreground text-xs">
                  <CalendarClock className="mr-1 inline size-3" />
                  {new Date(iv.scheduledAt).toLocaleString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                  {iv.durationMin ? ` · ${iv.durationMin} min` : ""}
                  {iv.location ? ` · ${iv.location}` : ""}
                </p>
              </div>

              {new Date(iv.scheduledAt) < new Date() &&
              iv.status === "SCHEDULED" ? (
                <Select
                  value={iv.status}
                  onValueChange={(v) => setStatus(iv.id, v)}
                  items={statusItems}
                >
                  <SelectTrigger className="w-[130px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusItems.map((it) => (
                      <SelectItem key={it.value} value={it.value}>
                        {it.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Badge variant="secondary">{iv.status}</Badge>
              )}

              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                aria-label="Delete interview"
                onClick={() => remove(iv.id)}
                disabled={isPending}
              >
                <Trash2 className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
