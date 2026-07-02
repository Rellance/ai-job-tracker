import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    application: { findFirst: vi.fn() },
    note: {
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));
vi.mock("@/lib/events", () => ({ emitActivity: vi.fn() }));

import { db } from "@/lib/db";
import { emitActivity } from "@/lib/events";
import { addNote } from "@/lib/services/note";

const appFindFirst = vi.mocked(db.application.findFirst);
const noteCreate = vi.mocked(db.note.create);
const emit = vi.mocked(emitActivity);

beforeEach(() => vi.clearAllMocks());

describe("addNote", () => {
  it("refuses to add a note to an application the user doesn't own", async () => {
    appFindFirst.mockResolvedValue(null as never);

    const res = await addNote("u1", {
      applicationId: "x",
      type: "GENERAL",
      body: "hi",
      pinned: false,
    });

    expect(res).toBeNull();
    expect(noteCreate).not.toHaveBeenCalled();
  });

  it("creates the note and emits NOTE_ADDED", async () => {
    appFindFirst.mockResolvedValue({ id: "a1" } as never);
    noteCreate.mockResolvedValue({ id: "n1" } as never);

    const res = await addNote("u1", {
      applicationId: "a1",
      type: "GENERAL",
      body: "hi",
      pinned: false,
    });

    expect(res).toEqual({ id: "n1" });
    expect(emit).toHaveBeenCalledWith(
      "u1",
      "NOTE_ADDED",
      expect.objectContaining({ entityId: "a1" }),
    );
  });
});
