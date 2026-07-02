"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { ApplicationPriority, ApplicationStatus } from "@prisma/client";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import {
  createApplicationAction,
  updateApplicationAction,
} from "@/app/(app)/applications/actions";
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
import { Textarea } from "@/components/ui/textarea";
import {
  PRIORITY_META,
  STATUS_META,
  STATUS_ORDER,
} from "@/lib/applications/meta";

const formSchema = z.object({
  company: z.string().min(1, "Company is required"),
  title: z.string().min(1, "Job title is required"),
  location: z.string().optional(),
  status: z.nativeEnum(ApplicationStatus),
  priority: z.nativeEnum(ApplicationPriority),
  salaryMin: z.string().optional(),
  salaryMax: z.string().optional(),
  currency: z.string().optional(),
  source: z.string().optional(),
  jobUrl: z.string().optional(),
  appliedAt: z.string().optional(),
  jobDescription: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

type ApplicationLike = {
  id: string;
  company: string;
  title: string;
  location: string | null;
  status: ApplicationStatus;
  priority: ApplicationPriority;
  salaryMin: number | null;
  salaryMax: number | null;
  currency: string;
  source: string | null;
  jobUrl: string | null;
  appliedAt: Date | string | null;
  jobDescription: string | null;
};

function toDateInput(d: Date | string | null): string {
  if (!d) return "";
  return new Date(d).toISOString().slice(0, 10);
}

const statusItems = STATUS_ORDER.map((s) => ({
  value: s,
  label: STATUS_META[s].label,
}));
const priorityItems = (Object.keys(PRIORITY_META) as ApplicationPriority[]).map(
  (p) => ({ value: p, label: PRIORITY_META[p].label }),
);

export function ApplicationForm({
  trigger,
  application,
  open: openProp,
  onOpenChange,
}: {
  trigger?: React.ReactElement;
  application?: ApplicationLike;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const router = useRouter();
  const [openState, setOpenState] = useState(false);
  const open = openProp ?? openState;
  const setOpen = onOpenChange ?? setOpenState;
  const [isPending, startTransition] = useTransition();
  const isEdit = Boolean(application);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      company: application?.company ?? "",
      title: application?.title ?? "",
      location: application?.location ?? "",
      status: application?.status ?? ApplicationStatus.WISHLIST,
      priority: application?.priority ?? ApplicationPriority.MEDIUM,
      salaryMin: application?.salaryMin?.toString() ?? "",
      salaryMax: application?.salaryMax?.toString() ?? "",
      currency: application?.currency ?? "USD",
      source: application?.source ?? "",
      jobUrl: application?.jobUrl ?? "",
      appliedAt: toDateInput(application?.appliedAt ?? null),
      jobDescription: application?.jobDescription ?? "",
    },
  });

  const onSubmit = (values: FormValues) => {
    startTransition(async () => {
      const res = application
        ? await updateApplicationAction(application.id, values)
        : await createApplicationAction(values);

      if (res.ok) {
        toast.success(isEdit ? "Application updated" : "Application added");
        setOpen(false);
        if (!isEdit) reset();
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? <DialogTrigger render={trigger} /> : null}
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit application" : "New application"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the details of this application."
              : "Track a new role you're interested in or have applied to."}
          </DialogDescription>
        </DialogHeader>

        <form
          id="application-form"
          onSubmit={handleSubmit(onSubmit)}
          className="grid grid-cols-1 gap-4 sm:grid-cols-2"
        >
          <div className="space-y-2">
            <Label htmlFor="company">Company *</Label>
            <Input id="company" {...register("company")} />
            {errors.company && (
              <p className="text-destructive text-xs">
                {errors.company.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="title">Job title *</Label>
            <Input id="title" {...register("title")} />
            {errors.title && (
              <p className="text-destructive text-xs">{errors.title.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              placeholder="Remote, Berlin…"
              {...register("location")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="source">Source</Label>
            <Input
              id="source"
              placeholder="LinkedIn, referral…"
              {...register("source")}
            />
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <Controller
              control={control}
              name="status"
              render={({ field }) => (
                <Select
                  items={statusItems}
                  value={field.value}
                  onValueChange={(v) => field.onChange(v)}
                >
                  <SelectTrigger className="w-full">
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
              )}
            />
          </div>
          <div className="space-y-2">
            <Label>Priority</Label>
            <Controller
              control={control}
              name="priority"
              render={({ field }) => (
                <Select
                  items={priorityItems}
                  value={field.value}
                  onValueChange={(v) => field.onChange(v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {priorityItems.map((it) => (
                      <SelectItem key={it.value} value={it.value}>
                        {it.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="grid grid-cols-3 gap-2 sm:col-span-2">
            <div className="space-y-2">
              <Label htmlFor="salaryMin">Salary min</Label>
              <Input
                id="salaryMin"
                type="number"
                inputMode="numeric"
                {...register("salaryMin")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="salaryMax">Salary max</Label>
              <Input
                id="salaryMax"
                type="number"
                inputMode="numeric"
                {...register("salaryMax")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Input id="currency" maxLength={3} {...register("currency")} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="appliedAt">Applied date</Label>
            <Input id="appliedAt" type="date" {...register("appliedAt")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="jobUrl">Job URL</Label>
            <Input
              id="jobUrl"
              type="url"
              placeholder="https://…"
              {...register("jobUrl")}
            />
            {errors.jobUrl && (
              <p className="text-destructive text-xs">
                {errors.jobUrl.message}
              </p>
            )}
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="jobDescription">Job description</Label>
            <Textarea
              id="jobDescription"
              rows={5}
              placeholder="Paste the job description — you'll be able to run AI analysis on it later."
              {...register("jobDescription")}
            />
          </div>
        </form>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button type="submit" form="application-form" disabled={isPending}>
            {isPending
              ? "Saving…"
              : isEdit
                ? "Save changes"
                : "Add application"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
