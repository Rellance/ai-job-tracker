"use server";

import { revalidatePath } from "next/cache";

import { requireUserId } from "@/lib/auth/session";
import * as applicationService from "@/lib/services/application";
import * as contactService from "@/lib/services/contact";
import * as noteService from "@/lib/services/note";
import {
  applicationCreateSchema,
  applicationUpdateSchema,
} from "@/lib/validations/application";
import { contactCreateSchema } from "@/lib/validations/contact";
import { noteCreateSchema } from "@/lib/validations/note";

type ActionResult = { ok: true; id?: string } | { ok: false; error: string };

function firstError(issues: { message: string }[]): string {
  return issues[0]?.message ?? "Invalid input";
}

export async function createApplicationAction(
  values: unknown,
): Promise<ActionResult> {
  const userId = await requireUserId();
  const parsed = applicationCreateSchema.safeParse(values);
  if (!parsed.success)
    return { ok: false, error: firstError(parsed.error.issues) };

  const app = await applicationService.createApplication(userId, parsed.data);
  revalidatePath("/applications");
  revalidatePath("/dashboard");
  revalidatePath("/board");
  return { ok: true, id: app.id };
}

export async function updateApplicationAction(
  id: string,
  values: unknown,
): Promise<ActionResult> {
  const userId = await requireUserId();
  const parsed = applicationUpdateSchema.safeParse(values);
  if (!parsed.success)
    return { ok: false, error: firstError(parsed.error.issues) };

  const app = await applicationService.updateApplication(
    userId,
    id,
    parsed.data,
  );
  if (!app) return { ok: false, error: "Application not found" };
  revalidatePath("/applications");
  revalidatePath(`/applications/${id}`);
  revalidatePath("/board");
  revalidatePath("/dashboard");
  return { ok: true, id };
}

export async function deleteApplicationAction(
  id: string,
): Promise<ActionResult> {
  const userId = await requireUserId();
  const res = await applicationService.deleteApplication(userId, id);
  if (!res) return { ok: false, error: "Application not found" };
  revalidatePath("/applications");
  revalidatePath("/dashboard");
  revalidatePath("/board");
  return { ok: true };
}

export async function addNoteAction(values: unknown): Promise<ActionResult> {
  const userId = await requireUserId();
  const parsed = noteCreateSchema.safeParse(values);
  if (!parsed.success)
    return { ok: false, error: firstError(parsed.error.issues) };

  const note = await noteService.addNote(userId, parsed.data);
  if (!note) return { ok: false, error: "Application not found" };
  revalidatePath(`/applications/${parsed.data.applicationId}`);
  return { ok: true, id: note.id };
}

export async function toggleNotePinAction(id: string, applicationId: string) {
  const userId = await requireUserId();
  await noteService.toggleNotePin(userId, id);
  revalidatePath(`/applications/${applicationId}`);
}

export async function deleteNoteAction(id: string, applicationId: string) {
  const userId = await requireUserId();
  await noteService.deleteNote(userId, id);
  revalidatePath(`/applications/${applicationId}`);
}

export async function addContactAction(values: unknown): Promise<ActionResult> {
  const userId = await requireUserId();
  const parsed = contactCreateSchema.safeParse(values);
  if (!parsed.success)
    return { ok: false, error: firstError(parsed.error.issues) };

  const contact = await contactService.addContact(userId, parsed.data);
  if (!contact) return { ok: false, error: "Application not found" };
  if (parsed.data.applicationId) {
    revalidatePath(`/applications/${parsed.data.applicationId}`);
  }
  return { ok: true, id: contact.id };
}

export async function deleteContactAction(id: string, applicationId: string) {
  const userId = await requireUserId();
  await contactService.deleteContact(userId, id);
  revalidatePath(`/applications/${applicationId}`);
}
