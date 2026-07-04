import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STYLES: Record<string, string> = {
  PENDING: "bg-status-wishlist/10 text-status-wishlist",
  RUNNING: "bg-status-applied/10 text-status-applied",
  COMPLETE: "bg-status-offer/10 text-status-offer",
  FAILED: "bg-status-rejected/10 text-status-rejected",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant="secondary" className={cn("font-medium", STYLES[status])}>
      {status.toLowerCase()}
    </Badge>
  );
}
