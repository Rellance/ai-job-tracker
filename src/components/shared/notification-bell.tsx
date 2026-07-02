"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";

import { markNotificationsReadAction } from "@/app/(app)/notifications/actions";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { formatRelative } from "@/lib/utils/format";

export type BellNotification = {
  id: string;
  title: string;
  body: string | null;
  readAt: Date | string | null;
  createdAt: Date | string;
};

export function NotificationBell({
  items,
  unread,
}: {
  items: BellNotification[];
  unread: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();

  // Light polling so reminders appear without a manual refresh (M4: push via jobs)
  useEffect(() => {
    const t = setInterval(() => router.refresh(), 90_000);
    return () => clearInterval(t);
  }, [router]);

  const onOpenChange = (next: boolean) => {
    setOpen(next);
    if (next && unread > 0) {
      startTransition(async () => {
        await markNotificationsReadAction();
        router.refresh();
      });
    }
  };

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            aria-label={
              unread > 0 ? `Notifications (${unread} unread)` : "Notifications"
            }
            className="relative"
          />
        }
      >
        <Bell className="size-5" />
        {unread > 0 && (
          <span className="bg-primary text-primary-foreground absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full text-[10px] font-semibold">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b px-3 py-2 text-sm font-medium">
          Notifications
        </div>
        {items.length === 0 ? (
          <p className="text-muted-foreground px-3 py-6 text-center text-sm">
            You&apos;re all caught up.
          </p>
        ) : (
          <ul className="max-h-80 overflow-y-auto">
            {items.map((n) => (
              <li
                key={n.id}
                className="hover:bg-accent/40 border-b px-3 py-2.5 last:border-b-0"
              >
                <div className="flex items-start gap-2">
                  {!n.readAt && (
                    <span className="bg-primary mt-1.5 size-1.5 shrink-0 rounded-full" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{n.title}</p>
                    {n.body && (
                      <p className="text-muted-foreground truncate text-xs">
                        {n.body}
                      </p>
                    )}
                  </div>
                  <span className="text-muted-foreground shrink-0 text-[10px]">
                    {formatRelative(n.createdAt)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}
