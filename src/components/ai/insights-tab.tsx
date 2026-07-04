"use client";

import Link from "next/link";
import { useState } from "react";
import type { AiArtifact } from "@prisma/client";
import { ChevronDown, Sparkles } from "lucide-react";

import { ResultPanel } from "@/components/ai/result-panel";
import { StatusBadge } from "@/components/ai/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { formatRelative } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

const KIND_LABEL: Record<string, string> = {
  JD_ANALYSIS: "JD Analyzer",
  RESUME_GAP: "Resume Gap Analysis",
  MATCH_SCORE: "Match Score",
  COVER_LETTER: "Cover Letter",
  INTERVIEW_PREP: "Interview Prep",
  RESUME_OPTIMIZE: "Resume Optimization",
};

const QUICK_TOOLS = [
  { slug: "analyze-jd", label: "Analyze JD" },
  { slug: "resume-gap", label: "Resume gap" },
  { slug: "match-score", label: "Match score" },
  { slug: "cover-letter", label: "Cover letter" },
  { slug: "interview-prep", label: "Interview prep" },
];

export function InsightsTab({
  applicationId,
  artifacts,
}: {
  applicationId: string;
  artifacts: AiArtifact[];
}) {
  const [openId, setOpenId] = useState<string | null>(
    artifacts.find((a) => a.status === "COMPLETE")?.id ?? null,
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-muted-foreground mr-1 inline-flex items-center gap-1 text-sm">
          <Sparkles className="size-4" /> Run a tool:
        </span>
        {QUICK_TOOLS.map((t) => (
          <Link
            key={t.slug}
            href={`/ai/${t.slug}?application=${applicationId}`}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {artifacts.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="No AI insights yet"
          description="Run a tool above — the job description is prefilled from this application."
        />
      ) : (
        <ul className="space-y-2">
          {artifacts.map((a) => {
            const open = openId === a.id;
            const canExpand = a.status === "COMPLETE" && a.result != null;
            return (
              <li key={a.id} className="rounded-lg border">
                <button
                  type="button"
                  onClick={() => canExpand && setOpenId(open ? null : a.id)}
                  className={cn(
                    "flex w-full flex-wrap items-center gap-3 p-3 text-left text-sm",
                    canExpand && "hover:bg-muted/50 cursor-pointer",
                  )}
                  aria-expanded={open}
                >
                  <span className="font-medium">
                    {KIND_LABEL[a.kind] ?? a.kind}
                  </span>
                  <StatusBadge status={a.status} />
                  {a.status === "FAILED" && a.errorMessage && (
                    <span className="text-status-rejected text-xs">
                      {a.errorMessage}
                    </span>
                  )}
                  <span className="text-muted-foreground ml-auto text-xs">
                    {formatRelative(a.createdAt)}
                  </span>
                  {canExpand && (
                    <ChevronDown
                      className={cn(
                        "text-muted-foreground size-4 transition-transform",
                        open && "rotate-180",
                      )}
                    />
                  )}
                </button>
                {open && canExpand && (
                  <div className="border-t p-4">
                    <ResultPanel kind={a.kind} result={a.result} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
