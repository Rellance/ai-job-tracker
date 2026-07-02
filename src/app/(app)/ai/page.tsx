import type { Metadata } from "next";
import { Sparkles } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";

export const metadata: Metadata = { title: "AI Tools" };

export default function AiPage() {
  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-semibold tracking-tight">
        AI Tools
      </h1>
      <EmptyState
        icon={Sparkles}
        title="AI Workspace coming in M4"
        description="Analyze job descriptions, find resume gaps, generate cover letters, and prep for interviews."
      />
    </div>
  );
}
