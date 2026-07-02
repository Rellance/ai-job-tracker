import { Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";

export function Brand({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-lg">
        <Sparkles className="size-4" />
      </div>
      <span className="font-heading text-sm font-semibold tracking-tight">
        AI Job Tracker
      </span>
    </div>
  );
}
