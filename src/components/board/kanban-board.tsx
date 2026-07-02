"use client";

import { useState, useTransition } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { toast } from "sonner";

import { moveCardAction } from "@/app/(app)/board/actions";
import { KanbanCard } from "@/components/board/kanban-card";
import { KanbanColumn } from "@/components/board/kanban-column";
import {
  BOARD_COLUMNS,
  COLUMN_DEFAULT_STATUS,
  STATUS_META,
  type BoardColumn,
} from "@/lib/applications/meta";
import type { BoardCard, BoardData } from "@/lib/services/board";

const COLUMN_IDS = BOARD_COLUMNS.map((c) => c.id);

function findColumn(board: BoardData, cardId: string): BoardColumn | null {
  for (const col of COLUMN_IDS) {
    if (board[col].some((c) => c.id === cardId)) return col;
  }
  return null;
}

export function KanbanBoard({ initial }: { initial: BoardData }) {
  const [board, setBoard] = useState<BoardData>(initial);
  const [active, setActive] = useState<BoardCard | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [, startTransition] = useTransition();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const targetColumn = (overId: string): BoardColumn | null => {
    if (COLUMN_IDS.includes(overId as BoardColumn))
      return overId as BoardColumn;
    return findColumn(board, overId);
  };

  function onDragStart(event: DragStartEvent) {
    const card = (event.active.data.current as { card?: BoardCard })?.card;
    setActive(card ?? null);
  }

  function onDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;
    const from = findColumn(board, String(active.id));
    const to = targetColumn(String(over.id));
    if (!from || !to || from === to) return;

    // Move the card across columns while dragging (visual feedback)
    setBoard((prev) => {
      const card = prev[from].find((c) => c.id === active.id);
      if (!card) return prev;
      const overIndex = prev[to].findIndex((c) => c.id === over.id);
      const insertAt = overIndex >= 0 ? overIndex : prev[to].length;
      return {
        ...prev,
        [from]: prev[from].filter((c) => c.id !== active.id),
        [to]: [
          ...prev[to].slice(0, insertAt),
          card,
          ...prev[to].slice(insertAt),
        ],
      };
    });
  }

  function onDragEnd(event: DragEndEvent) {
    const { active: dragged, over } = event;
    setActive(null);
    if (!over) return;

    const cardId = String(dragged.id);
    const column = findColumn(board, cardId);
    if (!column) return;

    let nextCards = board[column];
    const overIndex = nextCards.findIndex((c) => c.id === over.id);
    const activeIndex = nextCards.findIndex((c) => c.id === cardId);
    if (overIndex >= 0 && activeIndex >= 0 && overIndex !== activeIndex) {
      nextCards = arrayMove(nextCards, activeIndex, overIndex);
    }

    // If the card landed in a column its detailed status doesn't belong to,
    // mirror the server's status change optimistically (incl. the sub-label).
    nextCards = nextCards.map((c) => {
      if (c.id !== cardId) return c;
      const meta = STATUS_META[c.status as keyof typeof STATUS_META];
      if (meta && meta.column === column) return c;
      const newStatus = COLUMN_DEFAULT_STATUS[column];
      return {
        ...c,
        status: newStatus,
        statusLabel: STATUS_META[newStatus].label,
      };
    });
    setBoard((prev) => ({ ...prev, [column]: nextCards }));

    const card = nextCards.find((c) => c.id === cardId);
    const label = BOARD_COLUMNS.find((c) => c.id === column)?.label ?? column;
    setAnnouncement(`${card?.company ?? "Card"} moved to ${label}`);

    const snapshot = initialSnapshot(board);
    startTransition(async () => {
      const res = await moveCardAction({
        applicationId: cardId,
        column,
        orderedIds: nextCards.map((c) => c.id),
      });
      if (!res.ok) {
        setBoard(snapshot); // rollback
        toast.error(res.error);
      }
    });
  }

  return (
    <>
      <span aria-live="polite" className="sr-only">
        {announcement}
      </span>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
        onDragCancel={() => setActive(null)}
      >
        <div className="flex gap-4 overflow-x-auto pb-4 md:grid md:grid-cols-5 md:overflow-visible">
          {BOARD_COLUMNS.map((col) => (
            <KanbanColumn
              key={col.id}
              id={col.id}
              label={col.label}
              cards={board[col.id]}
            />
          ))}
        </div>
        <DragOverlay>
          {active ? <KanbanCard card={active} overlay /> : null}
        </DragOverlay>
      </DndContext>
    </>
  );
}

function initialSnapshot(board: BoardData): BoardData {
  return {
    WISHLIST: [...board.WISHLIST],
    APPLIED: [...board.APPLIED],
    INTERVIEW: [...board.INTERVIEW],
    OFFER: [...board.OFFER],
    REJECTED: [...board.REJECTED],
  };
}
