import { db } from "@/lib/db";
import { emitActivity } from "@/lib/events";
import type { NoteCreateInput, NoteUpdateInput } from "@/lib/validations/note";

export async function addNote(userId: string, data: NoteCreateInput) {
  const app = await db.application.findFirst({
    where: { id: data.applicationId, userId },
    select: { id: true },
  });
  if (!app) return null;

  const note = await db.note.create({ data: { ...data, userId } });
  await emitActivity(userId, "NOTE_ADDED", {
    entityType: "Application",
    entityId: data.applicationId,
    metadata: { type: data.type },
  });
  return note;
}

export async function updateNote(
  userId: string,
  id: string,
  data: NoteUpdateInput,
) {
  const existing = await db.note.findFirst({ where: { id, userId } });
  if (!existing) return null;
  return db.note.update({ where: { id }, data });
}

export async function toggleNotePin(userId: string, id: string) {
  const existing = await db.note.findFirst({ where: { id, userId } });
  if (!existing) return null;
  return db.note.update({
    where: { id },
    data: { pinned: !existing.pinned },
  });
}

export async function deleteNote(userId: string, id: string) {
  const existing = await db.note.findFirst({ where: { id, userId } });
  if (!existing) return null;
  await db.note.delete({ where: { id } });
  return existing;
}
