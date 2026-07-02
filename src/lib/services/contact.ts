import { db } from "@/lib/db";
import type { ContactCreateInput } from "@/lib/validations/contact";

export async function addContact(userId: string, data: ContactCreateInput) {
  if (data.applicationId) {
    const app = await db.application.findFirst({
      where: { id: data.applicationId, userId },
      select: { id: true },
    });
    if (!app) return null;
  }
  return db.contact.create({ data: { ...data, userId } });
}

export async function deleteContact(userId: string, id: string) {
  const existing = await db.contact.findFirst({ where: { id, userId } });
  if (!existing) return null;
  await db.contact.delete({ where: { id } });
  return existing;
}
