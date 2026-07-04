import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { ToolWorkspace } from "@/components/ai/tool-workspace";
import { toolBySlug, type ToolKind } from "@/lib/ai/schemas";
import { requireUserId } from "@/lib/auth/session";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "AI Tool" };

const NEEDS_RESUME: ToolKind[] = [
  "RESUME_GAP",
  "MATCH_SCORE",
  "COVER_LETTER",
  "RESUME_OPTIMIZE",
];

export default async function AiToolPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ application?: string }>;
}) {
  const userId = await requireUserId();
  const { slug } = await params;
  const { application: appParam } = await searchParams;

  const tool = toolBySlug(slug);
  if (!tool) notFound();

  const [applications, prefillApp] = await Promise.all([
    db.application.findMany({
      where: { userId },
      select: { id: true, company: true, title: true },
      orderBy: { updatedAt: "desc" },
    }),
    appParam
      ? db.application.findFirst({
          where: { id: appParam, userId },
          select: { id: true, jobDescription: true },
        })
      : null,
  ]);

  return (
    <div className="space-y-6">
      <Link
        href="/ai"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
      >
        <ArrowLeft className="size-4" />
        AI Tools
      </Link>

      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          {tool.label}
        </h1>
        <p className="text-muted-foreground text-sm">
          Runs in the background — the result is saved and reusable.
        </p>
      </div>

      <ToolWorkspace
        slug={tool.slug}
        label={tool.label}
        needsJd={true}
        jdOptional={tool.kind === "RESUME_OPTIMIZE"}
        needsResume={NEEDS_RESUME.includes(tool.kind)}
        hasTone={tool.kind === "COVER_LETTER"}
        applications={applications}
        initialJobDescription={prefillApp?.jobDescription ?? undefined}
        initialApplicationId={prefillApp?.id}
      />
    </div>
  );
}
