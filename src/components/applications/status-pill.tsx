import type { ApplicationStatus } from "@prisma/client";

import { STATUS_META, STATUS_TONE_CLASSES } from "@/lib/applications/meta";
import { cn } from "@/lib/utils";

export function StatusPill({
  status,
  className,
}: {
  status: ApplicationStatus;
  className?: string;
}) {
  const meta = STATUS_META[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium",
        STATUS_TONE_CLASSES[meta.tone],
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {meta.label}
    </span>
  );
}
