"use client";

import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

import { KanbanCard } from "@/components/board/kanban-card";
import type { BoardColumn } from "@/lib/applications/meta";
import type { BoardCard } from "@/lib/services/board";
import { cn } from "@/lib/utils";

const COLUMN_DOT: Record<BoardColumn, string> = {
  WISHLIST: "bg-status-wishlist",
  APPLIED: "bg-status-applied",
  INTERVIEW: "bg-status-interview",
  OFFER: "bg-status-offer",
  REJECTED: "bg-status-rejected",
};

export function KanbanColumn({
  id,
  label,
  cards,
}: {
  id: BoardColumn;
  label: string;
  cards: BoardCard[];
}) {
  const { setNodeRef, isOver } = useDroppable({ id, data: { column: id } });

  return (
    <div className="flex w-72 shrink-0 flex-col md:w-auto md:min-w-0 md:flex-1">
      <div className="mb-2 flex items-center gap-2 px-1">
        <span className={cn("size-2 rounded-full", COLUMN_DOT[id])} />
        <h2 className="text-sm font-medium">{label}</h2>
        <span className="text-muted-foreground text-xs tabular-nums">
          {cards.length}
        </span>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "bg-muted/40 flex min-h-40 flex-1 flex-col gap-2 rounded-lg border border-dashed p-2 transition-colors",
          isOver && "border-primary/50 bg-primary/5",
        )}
      >
        <SortableContext
          items={cards.map((c) => c.id)}
          strategy={verticalListSortingStrategy}
        >
          {cards.map((card) => (
            <KanbanCard key={card.id} card={card} />
          ))}
        </SortableContext>
        {cards.length === 0 && (
          <p className="text-muted-foreground/60 m-auto py-6 text-center text-xs">
            Drop applications here
          </p>
        )}
      </div>
    </div>
  );
}
