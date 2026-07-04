import type { Metadata } from "next";

import { ResumesManager } from "@/components/resumes/resumes-manager";
import { requireUserId } from "@/lib/auth/session";
import { listResumes } from "@/lib/services/resume";

export const metadata: Metadata = { title: "Resumes" };

export default async function ResumesPage() {
  const userId = await requireUserId();
  const resumes = await listResumes(userId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Resumes
        </h1>
        <p className="text-muted-foreground text-sm">
          Keep versions of your resume — AI tools use the extracted text.
        </p>
      </div>
      <ResumesManager resumes={resumes} />
    </div>
  );
}
