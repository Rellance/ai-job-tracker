import type { Metadata } from "next";
import Link from "next/link";
import {
  FileSearch,
  FileText,
  Gauge,
  ListChecks,
  MessageSquareText,
  PenLine,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

import { StatusBadge } from "@/components/ai/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { TOOLS, type ToolKind } from "@/lib/ai/schemas";
import { requireUserId } from "@/lib/auth/session";
import { listArtifacts } from "@/lib/services/aiArtifact";
import { getQuota } from "@/lib/services/quota";
import { formatRelative } from "@/lib/utils/format";

export const metadata: Metadata = { title: "AI Tools" };

const TOOL_CARDS: {
  kind: ToolKind;
  icon: LucideIcon;
  description: string;
}[] = [
  {
    kind: "JD_ANALYSIS",
    icon: FileSearch,
    description:
      "Extract skills, technologies, requirements, and seniority from any job description.",
  },
  {
    kind: "RESUME_GAP",
    icon: ListChecks,
    description:
      "Compare your resume against a JD: matching skills, gaps, and a match score.",
  },
  {
    kind: "MATCH_SCORE",
    icon: Gauge,
    description:
      "An honest 0–100 fit score with strengths, gaps, and rationale.",
  },
  {
    kind: "COVER_LETTER",
    icon: PenLine,
    description:
      "A tailored cover letter draft grounded in your real experience.",
  },
  {
    kind: "INTERVIEW_PREP",
    icon: MessageSquareText,
    description:
      "Likely technical, behavioral, and role-specific questions with answer hints.",
  },
  {
    kind: "RESUME_OPTIMIZE",
    icon: FileText,
    description:
      "Weak areas, missing keywords, and ATS improvements for your resume.",
  },
];

export default async function AiHubPage() {
  const userId = await requireUserId();
  const [quota, artifacts] = await Promise.all([
    getQuota(userId),
    listArtifacts(userId, 8),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            AI Tools
          </h1>
          <p className="text-muted-foreground text-sm">
            Structured AI runs, saved as artifacts you can attach to
            applications.
          </p>
        </div>
        {quota.limit !== null && (
          <div className="w-56 space-y-1.5">
            <div className="text-muted-foreground flex justify-between text-xs">
              <span>AI actions this month</span>
              <span className="tabular-nums">
                {quota.used}/{quota.limit}
              </span>
            </div>
            <Progress value={(quota.used / quota.limit) * 100} />
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {TOOL_CARDS.map((t) => {
          const tool = TOOLS[t.kind];
          const Icon = t.icon;
          return (
            <Link key={t.kind} href={`/ai/${tool.slug}`}>
              <Card className="hover:border-primary/40 h-full transition-colors">
                <CardContent className="pt-6">
                  <div className="bg-primary/10 text-primary mb-3 flex size-10 items-center justify-center rounded-lg">
                    <Icon className="size-5" />
                  </div>
                  <h3 className="font-medium">{tool.label}</h3>
                  <p className="text-muted-foreground mt-1 text-sm">
                    {t.description}
                  </p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-medium">Recent runs</h2>
        {artifacts.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Nothing yet — run your first tool above.
          </p>
        ) : (
          <ul className="space-y-2">
            {artifacts.map((a) => {
              const kind = a.kind as ToolKind;
              return (
                <li
                  key={a.id}
                  className="flex flex-wrap items-center gap-3 rounded-lg border p-3 text-sm"
                >
                  <Sparkles className="text-primary size-4 shrink-0" />
                  <span className="font-medium">
                    {TOOLS[kind]?.label ?? a.kind}
                  </span>
                  <StatusBadge status={a.status} />
                  {a.application && (
                    <Link
                      href={`/applications/${a.application.id}`}
                      className="text-muted-foreground hover:text-foreground text-xs hover:underline"
                    >
                      {a.application.company} — {a.application.title}
                    </Link>
                  )}
                  <span className="text-muted-foreground ml-auto text-xs">
                    {formatRelative(a.createdAt)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
