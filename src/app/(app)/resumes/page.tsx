import type { Metadata } from "next";
import { FileText } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";

export const metadata: Metadata = { title: "Resumes" };

export default function ResumesPage() {
  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-semibold tracking-tight">
        Resumes
      </h1>
      <EmptyState
        icon={FileText}
        title="Resume management coming in M4"
        description="Upload multiple resume versions and use them across AI tools."
      />
    </div>
  );
}
