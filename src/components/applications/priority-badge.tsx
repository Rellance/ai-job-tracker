import type { ApplicationPriority } from "@prisma/client";

import { PRIORITY_META } from "@/lib/applications/meta";
import { cn } from "@/lib/utils";

export function PriorityBadge({
  priority,
  className,
}: {
  priority: ApplicationPriority;
  className?: string;
}) {
  const meta = PRIORITY_META[priority];
  return (
    <span className={cn("text-xs", meta.className, className)}>
      {meta.label}
    </span>
  );
}
