import { db } from "@/lib/db";
import {
  BOARD_COLUMNS,
  STATUS_META,
  type BoardColumn,
} from "@/lib/applications/meta";

export type BoardCard = {
  id: string;
  company: string;
  title: string;
  status: string;
  statusLabel: string;
  priority: string;
  boardOrder: number;
  nextInterviewAt: Date | null;
};

export type BoardData = Record<BoardColumn, BoardCard[]>;

export async function getBoard(userId: string): Promise<BoardData> {
  const apps = await db.application.findMany({
    where: { userId },
    orderBy: [{ boardOrder: "asc" }, { updatedAt: "desc" }],
    include: {
      interviews: {
        where: { status: "SCHEDULED", scheduledAt: { gte: new Date() } },
        orderBy: { scheduledAt: "asc" },
        take: 1,
      },
    },
  });

  const board: BoardData = {
    WISHLIST: [],
    APPLIED: [],
    INTERVIEW: [],
    OFFER: [],
    REJECTED: [],
  };

  for (const app of apps) {
    const meta = STATUS_META[app.status];
    board[meta.column].push({
      id: app.id,
      company: app.company,
      title: app.title,
      status: app.status,
      statusLabel: meta.label,
      priority: app.priority,
      boardOrder: app.boardOrder,
      nextInterviewAt: app.interviews[0]?.scheduledAt ?? null,
    });
  }

  for (const col of BOARD_COLUMNS) {
    board[col.id].sort((a, b) => a.boardOrder - b.boardOrder);
  }

  return board;
}
