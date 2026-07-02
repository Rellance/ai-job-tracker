import type { Metadata } from "next";
import { KanbanSquare, Plus } from "lucide-react";

import { ApplicationForm } from "@/components/applications/application-form";
import { KanbanBoard } from "@/components/board/kanban-board";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { requireUserId } from "@/lib/auth/session";
import { getBoard } from "@/lib/services/board";

export const metadata: Metadata = { title: "Board" };

export default async function BoardPage() {
  const userId = await requireUserId();
  const board = await getBoard(userId);
  const total = Object.values(board).reduce((n, col) => n + col.length, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Board
          </h1>
          <p className="text-muted-foreground text-sm">
            Drag applications through your pipeline.
          </p>
        </div>
        <ApplicationForm
          trigger={
            <Button>
              <Plus className="size-4" />
              New application
            </Button>
          }
        />
      </div>

      {total === 0 ? (
        <EmptyState
          icon={KanbanSquare}
          title="Nothing on the board yet"
          description="Add an application and it will appear in the Wishlist column."
          action={
            <ApplicationForm
              trigger={
                <Button>
                  <Plus className="size-4" />
                  New application
                </Button>
              }
            />
          }
        />
      ) : (
        <KanbanBoard initial={board} />
      )}
    </div>
  );
}
