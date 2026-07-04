"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, Sparkles, XCircle } from "lucide-react";
import { toast } from "sonner";

import { attachArtifactAction } from "@/app/(app)/ai/actions";
import { ResultPanel } from "@/components/ai/result-panel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type ApplicationOption = { id: string; company: string; title: string };

type Artifact = {
  id: string;
  kind: string;
  status: "PENDING" | "RUNNING" | "COMPLETE" | "FAILED";
  result: unknown;
  errorMessage: string | null;
  model: string | null;
  costCents: number | null;
  applicationId: string | null;
};

const toneItems = [
  { value: "PROFESSIONAL", label: "Professional" },
  { value: "ENTHUSIASTIC", label: "Enthusiastic" },
  { value: "CONCISE", label: "Concise" },
  { value: "FORMAL", label: "Formal" },
];

export function ToolWorkspace({
  slug,
  label,
  needsJd,
  jdOptional,
  needsResume,
  hasTone,
  applications,
  initialJobDescription,
  initialApplicationId,
}: {
  slug: string;
  label: string;
  needsJd: boolean;
  jdOptional?: boolean;
  needsResume: boolean;
  hasTone?: boolean;
  applications: ApplicationOption[];
  initialJobDescription?: string;
  initialApplicationId?: string;
}) {
  const router = useRouter();
  const [jd, setJd] = useState(initialJobDescription ?? "");
  const [resume, setResume] = useState("");
  const [tone, setTone] = useState("PROFESSIONAL");
  const [applicationId, setApplicationId] = useState(
    initialApplicationId ?? "",
  );
  const [artifact, setArtifact] = useState<Artifact | null>(null);
  const [running, setRunning] = useState(false);
  const [, startTransition] = useTransition();
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const poll = (id: string) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      const res = await fetch(`/api/ai/artifacts/${id}`);
      if (!res.ok) return;
      const data = (await res.json()) as Artifact;
      setArtifact(data);
      if (data.status === "COMPLETE" || data.status === "FAILED") {
        if (pollRef.current) clearInterval(pollRef.current);
        setRunning(false);
        router.refresh();
      }
    }, 2500);
  };

  const run = async () => {
    setRunning(true);
    setArtifact(null);
    const body: Record<string, unknown> = {};
    if (needsJd && jd) body.jobDescription = jd;
    if (needsResume) body.resumeText = resume;
    if (hasTone) body.tone = tone;
    if (applicationId) body.applicationId = applicationId;

    const res = await fetch(`/api/ai/${slug}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();

    if (!res.ok) {
      setRunning(false);
      toast.error(data?.error?.message ?? "Couldn't start the run");
      return;
    }
    if (data.cached) {
      const art = (await fetch(`/api/ai/artifacts/${data.id}`).then((r) =>
        r.json(),
      )) as Artifact;
      setArtifact(art);
      const stillGoing = art.status === "PENDING" || art.status === "RUNNING";
      setRunning(stillGoing);
      if (stillGoing) poll(data.id);
      else toast.info("Same input as before — showing the cached result.");
      return;
    }
    poll(data.id);
  };

  const attach = (appId: string) => {
    if (!artifact) return;
    startTransition(async () => {
      const res = await attachArtifactAction(artifact.id, appId);
      if (res.ok) {
        toast.success("Attached to application");
        setArtifact({ ...artifact, applicationId: appId });
      } else {
        toast.error(res.error);
      }
    });
  };

  const canRun =
    (!needsJd || jdOptional || jd.trim().length >= 80) &&
    (!needsResume || resume.trim().length >= 80) &&
    !running;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Input</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {needsJd && (
            <div className="space-y-2">
              <Label htmlFor="jd">
                Job description{jdOptional ? " (optional)" : ""}
              </Label>
              <Textarea
                id="jd"
                rows={10}
                placeholder="Paste the job description…"
                value={jd}
                onChange={(e) => setJd(e.target.value)}
              />
            </div>
          )}
          {needsResume && (
            <div className="space-y-2">
              <Label htmlFor="resume">Resume text</Label>
              <Textarea
                id="resume"
                rows={10}
                placeholder="Paste your resume as plain text…"
                value={resume}
                onChange={(e) => setResume(e.target.value)}
              />
            </div>
          )}
          {hasTone && (
            <div className="space-y-2">
              <Label>Tone</Label>
              <Select
                value={tone}
                onValueChange={(v) => v && setTone(v)}
                items={toneItems}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {toneItems.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-2">
            <Label>Link to application (optional)</Label>
            <Select
              value={applicationId || null}
              onValueChange={(v) => setApplicationId(v ?? "")}
              items={applications.map((a) => ({
                value: a.id,
                label: `${a.company} — ${a.title}`,
              }))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Not linked" />
              </SelectTrigger>
              <SelectContent>
                {applications.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.company} — {a.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button onClick={run} disabled={!canRun} className="w-full">
            {running ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                {artifact?.status === "RUNNING" ? "Analyzing…" : "Queued…"}
              </>
            ) : (
              <>
                <Sparkles className="size-4" />
                Run {label}
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            Result
            {artifact?.status === "COMPLETE" && (
              <CheckCircle2 className="text-status-offer size-4" />
            )}
            {artifact?.status === "FAILED" && (
              <XCircle className="text-status-rejected size-4" />
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!artifact && !running && (
            <p className="text-muted-foreground py-10 text-center text-sm">
              Fill the input and run the tool — the structured result shows up
              here.
            </p>
          )}
          {running && (!artifact || artifact.status !== "FAILED") && (
            <div className="text-muted-foreground flex flex-col items-center gap-3 py-10 text-sm">
              <Loader2 className="size-6 animate-spin" />
              Running in the background — usually 5–20 seconds.
            </div>
          )}
          {artifact?.status === "FAILED" && (
            <div className="space-y-3 py-6 text-center">
              <p className="text-status-rejected text-sm">
                {artifact.errorMessage ?? "The run failed."}
              </p>
              <Button variant="outline" size="sm" onClick={run}>
                Retry
              </Button>
            </div>
          )}
          {artifact?.status === "COMPLETE" && (
            <div className="space-y-4">
              <ResultPanel kind={artifact.kind} result={artifact.result} />
              <div className="text-muted-foreground flex flex-wrap items-center justify-between gap-2 border-t pt-3 text-xs">
                <span>
                  {artifact.model} ·{" "}
                  {(artifact.costCents ?? 0) === 0
                    ? "<$0.01"
                    : `$${((artifact.costCents ?? 0) / 100).toFixed(2)}`}
                </span>
                {!artifact.applicationId && applicationId && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => attach(applicationId)}
                  >
                    Attach to application
                  </Button>
                )}
                {artifact.applicationId && <span>✓ attached</span>}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
