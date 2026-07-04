import { randomUUID } from "crypto";

import { db } from "@/lib/db";
import { emitActivity } from "@/lib/events";
import { putFile, readFileByKey, removeFile } from "@/lib/storage";

export const RESUME_MAX_BYTES = 5 * 1024 * 1024; // 5 MB (PRD E10)

export const RESUME_MIME_EXT: Record<string, string> = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "docx",
  "text/plain": "txt",
};

export async function listResumes(userId: string) {
  return db.resume.findMany({
    where: { userId },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    include: { _count: { select: { applications: true } } },
  });
}

export type ResumeListItem = Awaited<ReturnType<typeof listResumes>>[number];

export async function createResume(
  userId: string,
  args: { label: string; mimeType: string; data: Buffer },
) {
  const ext = RESUME_MIME_EXT[args.mimeType];
  if (!ext) throw new Error("Unsupported file type");
  if (args.data.byteLength > RESUME_MAX_BYTES)
    throw new Error("File too large");

  const fileKey = `${userId}/${randomUUID()}.${ext}`;
  await putFile(fileKey, args.data);

  const count = await db.resume.count({ where: { userId } });
  const resume = await db.resume.create({
    data: {
      userId,
      label: args.label,
      fileKey,
      mimeType: args.mimeType,
      sizeBytes: args.data.byteLength,
      isDefault: count === 0, // first upload becomes the default
    },
  });

  await emitActivity(userId, "RESUME_UPLOADED", {
    entityType: "Resume",
    entityId: resume.id,
    metadata: { label: args.label },
  });
  return resume;
}

export async function setDefaultResume(userId: string, id: string) {
  const resume = await db.resume.findFirst({ where: { id, userId } });
  if (!resume) return null;
  await db.$transaction([
    db.resume.updateMany({ where: { userId }, data: { isDefault: false } }),
    db.resume.update({ where: { id }, data: { isDefault: true } }),
  ]);
  return resume;
}

export async function deleteResume(userId: string, id: string) {
  const resume = await db.resume.findFirst({ where: { id, userId } });
  if (!resume) return null;
  await db.resume.delete({ where: { id } });
  await removeFile(resume.fileKey);
  return resume;
}

/** Worker-side: extract plain text from the stored file into parsedText. */
export async function processResumeParse(resumeId: string) {
  const resume = await db.resume.findUnique({ where: { id: resumeId } });
  if (!resume) return;
  if (resume.parsedText) return; // idempotent

  const buffer = await readFileByKey(resume.fileKey);
  let text = "";

  if (resume.mimeType === "application/pdf") {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    try {
      const parsed = await parser.getText();
      text = parsed.text;
    } finally {
      await parser.destroy();
    }
  } else if (
    resume.mimeType ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    const mammoth = await import("mammoth");
    const parsed = await mammoth.extractRawText({ buffer });
    text = parsed.value;
  } else {
    text = buffer.toString("utf-8");
  }

  const cleaned = text
    .replace(/\r/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  await db.resume.update({
    where: { id: resumeId },
    data: {
      parsedText:
        cleaned || "(no extractable text — is this a scanned document?)",
    },
  });
}
