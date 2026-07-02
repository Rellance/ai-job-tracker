"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CalendarClock, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";

import { deleteApplicationAction } from "@/app/(app)/applications/actions";
import { ApplicationForm } from "@/components/applications/application-form";
import { PriorityBadge } from "@/components/applications/priority-badge";
import { StatusPill } from "@/components/applications/status-pill";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ApplicationListItem } from "@/lib/services/application";
import { formatDate, formatSalary } from "@/lib/utils/format";

export function ApplicationsTable({ items }: { items: ApplicationListItem[] }) {
  const router = useRouter();
  const [editApp, setEditApp] = useState<ApplicationListItem | null>(null);
  const [deleteApp, setDeleteApp] = useState<ApplicationListItem | null>(null);
  const [isPending, startTransition] = useTransition();

  const confirmDelete = () => {
    if (!deleteApp) return;
    const target = deleteApp;
    startTransition(async () => {
      const res = await deleteApplicationAction(target.id);
      if (res.ok) {
        toast.success("Application deleted");
        setDeleteApp(null);
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  };

  return (
    <>
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Company / Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Salary</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Applied</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((app) => {
              const nextInterview = app.interviews[0];
              return (
                <TableRow key={app.id}>
                  <TableCell>
                    <Link
                      href={`/applications/${app.id}`}
                      className="hover:underline"
                    >
                      <div className="font-medium">{app.company}</div>
                      <div className="text-muted-foreground text-sm">
                        {app.title}
                      </div>
                    </Link>
                    {nextInterview && (
                      <div className="text-status-interview mt-1 inline-flex items-center gap-1 text-xs">
                        <CalendarClock className="size-3" />
                        {formatDate(nextInterview.scheduledAt)}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <StatusPill status={app.status} />
                  </TableCell>
                  <TableCell>
                    <PriorityBadge priority={app.priority} />
                  </TableCell>
                  <TableCell className="text-sm whitespace-nowrap">
                    {formatSalary(app.salaryMin, app.salaryMax, app.currency) ??
                      "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {app.source ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                    {formatDate(app.appliedAt)}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Row actions"
                          />
                        }
                      >
                        <MoreHorizontal className="size-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          render={<Link href={`/applications/${app.id}`} />}
                        >
                          View details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setEditApp(app)}>
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => setDeleteApp(app)}
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {editApp && (
        <ApplicationForm
          application={editApp}
          open={Boolean(editApp)}
          onOpenChange={(o) => !o && setEditApp(null)}
        />
      )}

      <Dialog
        open={Boolean(deleteApp)}
        onOpenChange={(o) => !o && setDeleteApp(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete application?</DialogTitle>
            <DialogDescription>
              {deleteApp
                ? `This permanently removes ${deleteApp.company} — ${deleteApp.title} and its notes and interviews.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteApp(null)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={isPending}
            >
              {isPending ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
