import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { enqueueResumeParse } from "@/lib/queue";
import {
  createResume,
  RESUME_MAX_BYTES,
  RESUME_MIME_EXT,
} from "@/lib/services/resume";

/** POST /api/resumes — multipart upload (PDF/DOCX/TXT ≤5MB), then a
 *  background job extracts parsedText for the AI tools. */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Sign in required" } },
      { status: 401 },
    );
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  const label = String(form?.get("label") ?? "").trim();

  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: { code: "VALIDATION", message: "Attach a file" } },
      { status: 400 },
    );
  }
  if (!(file.type in RESUME_MIME_EXT)) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION",
          message: "Only PDF, DOCX or TXT files are supported",
        },
      },
      { status: 400 },
    );
  }
  if (file.size > RESUME_MAX_BYTES) {
    return NextResponse.json(
      { error: { code: "VALIDATION", message: "Max file size is 5 MB" } },
      { status: 400 },
    );
  }

  const data = Buffer.from(await file.arrayBuffer());
  const resume = await createResume(session.user.id, {
    label: label || file.name.replace(/\.[a-z0-9]+$/i, ""),
    mimeType: file.type,
    data,
  });
  await enqueueResumeParse(resume.id);

  return NextResponse.json({ id: resume.id }, { status: 201 });
}
