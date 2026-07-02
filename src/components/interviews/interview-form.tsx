"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { InterviewType } from "@prisma/client";
import { toast } from "sonner";

import { createInterviewAction } from "@/app/(app)/calendar/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { INTERVIEW_TYPE_LABEL } from "@/lib/validations/interview";

export type ApplicationOption = {
  id: string;
  company: string;
  title: string;
};

const typeItems = (Object.keys(INTERVIEW_TYPE_LABEL) as InterviewType[]).map(
  (t) => ({ value: t, label: INTERVIEW_TYPE_LABEL[t] }),
);

const reminderItems = [
  { value: "0", label: "No reminder" },
  { value: "60", label: "1 hour before" },
  { value: "180", label: "3 hours before" },
  { value: "1440", label: "1 day before" },
];

function toLocalInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function InterviewForm({
  trigger,
  applications,
  fixedApplicationId,
  defaultDate,
  open: openProp,
  onOpenChange,
}: {
  trigger?: React.ReactElement;
  /** options for the picker; not needed when fixedApplicationId is set */
  applications?: ApplicationOption[];
  fixedApplicationId?: string;
  defaultDate?: Date;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const router = useRouter();
  const [openState, setOpenState] = useState(false);
  const open = openProp ?? openState;
  const setOpen = onOpenChange ?? setOpenState;
  const [isPending, startTransition] = useTransition();

  const initialDate = () => {
    const d = defaultDate ? new Date(defaultDate) : new Date();
    d.setHours(10, 0, 0, 0);
    if (d.getTime() < Date.now()) d.setDate(d.getDate());
    return toLocalInputValue(d);
  };

  const [applicationId, setApplicationId] = useState(fixedApplicationId ?? "");
  const [type, setType] = useState<InterviewType>(InterviewType.PHONE_SCREEN);
  const [scheduledAt, setScheduledAt] = useState(initialDate);
  const [durationMin, setDurationMin] = useState("60");
  const [meetingUrl, setMeetingUrl] = useState("");
  const [location, setLocation] = useState("");
  const [reminder, setReminder] = useState("60");

  const submit = () => {
    startTransition(async () => {
      const res = await createInterviewAction({
        applicationId: fixedApplicationId ?? applicationId,
        type,
        scheduledAt,
        durationMin,
        location,
        meetingUrl,
        reminderMinutesBefore: reminder,
      });
      if (res.ok) {
        toast.success("Interview scheduled");
        setOpen(false);
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? <DialogTrigger render={trigger} /> : null}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Schedule interview</DialogTitle>
          <DialogDescription>
            It will appear on your calendar with an optional reminder.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!fixedApplicationId && (
            <div className="space-y-2">
              <Label>Application</Label>
              <Select
                value={applicationId || null}
                onValueChange={(v) => setApplicationId(v ?? "")}
                items={(applications ?? []).map((a) => ({
                  value: a.id,
                  label: `${a.company} — ${a.title}`,
                }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pick an application" />
                </SelectTrigger>
                <SelectContent>
                  {(applications ?? []).map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.company} — {a.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={type}
                onValueChange={(v) => v && setType(v as InterviewType)}
                items={typeItems}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {typeItems.map((it) => (
                    <SelectItem key={it.value} value={it.value}>
                      {it.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="iv-duration">Duration (min)</Label>
              <Input
                id="iv-duration"
                type="number"
                inputMode="numeric"
                value={durationMin}
                onChange={(e) => setDurationMin(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="iv-when">When</Label>
            <Input
              id="iv-when"
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="iv-url">Meeting URL</Label>
              <Input
                id="iv-url"
                type="url"
                placeholder="https://meet…"
                value={meetingUrl}
                onChange={(e) => setMeetingUrl(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="iv-loc">Location</Label>
              <Input
                id="iv-loc"
                placeholder="Remote / office"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Reminder</Label>
            <Select
              value={reminder}
              onValueChange={(v) => v && setReminder(v)}
              items={reminderItems}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {reminderItems.map((it) => (
                  <SelectItem key={it.value} value={it.value}>
                    {it.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={isPending || (!fixedApplicationId && !applicationId)}
          >
            {isPending ? "Scheduling…" : "Schedule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
