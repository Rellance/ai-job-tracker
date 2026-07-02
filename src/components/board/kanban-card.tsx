"use client";

import Link from "next/link";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CalendarClock, GripVertical } from "lucide-react";

import type { BoardCard } from "@/lib/services/board";
import { formatDate } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

export function KanbanCard({
  card,
  overlay = false,
}: {
  card: BoardCard;
  overlay?: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id, data: { card } });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "bg-card group rounded-lg border p-3 shadow-sm",
        isDragging && "opacity-40",
        overlay && "rotate-2 shadow-lg",
      )}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label={`Drag ${card.company} — ${card.title}`}
          className="text-muted-foreground/40 hover:text-muted-foreground mt-0.5 cursor-grab touch-none active:cursor-grabbing"
        >
          <GripVertical className="size-4" />
        </button>
        <div className="min-w-0 flex-1">
          <Link
            href={`/applications/${card.id}`}
            className="block truncate text-sm font-medium hover:underline"
          >
            {card.company}
          </Link>
          <p className="text-muted-foreground truncate text-xs">{card.title}</p>
          <div className="mt-2 flex items-center gap-2">
            <span className="bg-muted text-muted-foreground rounded-full px-1.5 py-0.5 text-[10px] font-medium">
              {card.statusLabel}
            </span>
            {card.nextInterviewAt && (
              <span className="text-status-interview inline-flex items-center gap-1 text-[10px]">
                <CalendarClock className="size-3" />
                {formatDate(card.nextInterviewAt)}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
