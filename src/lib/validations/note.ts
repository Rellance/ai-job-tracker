import { NoteType } from "@prisma/client";
import { z } from "zod";

export const noteCreateSchema = z.object({
  applicationId: z.string().min(1),
  type: z.nativeEnum(NoteType).default(NoteType.GENERAL),
  body: z.string().trim().min(1, "Note can't be empty").max(10_000),
  pinned: z.boolean().default(false),
});

export const noteUpdateSchema = z.object({
  body: z.string().trim().min(1, "Note can't be empty").max(10_000).optional(),
  type: z.nativeEnum(NoteType).optional(),
  pinned: z.boolean().optional(),
});

export type NoteCreateInput = z.infer<typeof noteCreateSchema>;
export type NoteUpdateInput = z.infer<typeof noteUpdateSchema>;
