"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  FileText,
  Loader2,
  Star,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

import {
  deleteResumeAction,
  setDefaultResumeAction,
} from "@/app/(app)/resumes/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatRelative } from "@/lib/utils/format";

type ResumeItem = {
  id: string;
  label: string;
  mimeType: string;
  sizeBytes: number;
  parsedText: string | null;
  isDefault: boolean;
  createdAt: Date | string;
  _count: { applications: number };
};

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ResumesManager({ resumes }: { resumes: ResumeItem[] }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [label, setLabel] = useState("");
  const [uploading, setUploading] = useState(false);
  const [isPending, startTransition] = useTransition();

  const upload = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      toast.error("Choose a PDF, DOCX or TXT file first");
      return;
    }
    setUploading(true);
    const form = new FormData();
    form.set("file", file);
    if (label.trim()) form.set("label", label.trim());

    const res = await fetch("/api/resumes", { method: "POST", body: form });
    setUploading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      toast.error(data?.error?.message ?? "Upload failed");
      return;
    }
    toast.success("Uploaded — extracting text in the background");
    setLabel("");
    if (fileRef.current) fileRef.current.value = "";
    router.refresh();
    // parse job usually lands within a few seconds
    setTimeout(() => router.refresh(), 4000);
  };

  const setDefault = (id: string) =>
    startTransition(async () => {
      const res = await setDefaultResumeAction(id);
      if (!res.ok) toast.error(res.error);
      router.refresh();
    });

  const remove = (id: string) =>
    startTransition(async () => {
      const res = await deleteResumeAction(id);
      if (!res.ok) toast.error(res.error);
      router.refresh();
    });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3 rounded-lg border p-4">
        <div className="space-y-1.5">
          <label htmlFor="resume-file" className="text-sm font-medium">
            File (PDF, DOCX, TXT · max 5 MB)
          </label>
          <Input
            id="resume-file"
            ref={fileRef}
            type="file"
            accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
            className="w-72"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="resume-label" className="text-sm font-medium">
            Label
          </label>
          <Input
            id="resume-label"
            placeholder="Backend v3"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="w-48"
          />
        </div>
        <Button onClick={upload} disabled={uploading}>
          {uploading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Upload className="size-4" />
          )}
          Upload resume
        </Button>
      </div>

      {resumes.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No resumes yet — upload one and the AI tools can use it with a single
          click.
        </p>
      ) : (
        <ul className="space-y-2">
          {resumes.map((r) => (
            <li
              key={r.id}
              className="flex flex-wrap items-center gap-3 rounded-lg border p-3"
            >
              <FileText className="text-muted-foreground size-5 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium">{r.label}</span>
                  {r.isDefault && <Badge>Default</Badge>}
                  {r.parsedText ? (
                    <span className="text-status-offer inline-flex items-center gap-1 text-xs">
                      <CheckCircle2 className="size-3" /> parsed
                    </span>
                  ) : (
                    <span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
                      <Loader2 className="size-3 animate-spin" /> extracting
                      text…
                    </span>
                  )}
                </div>
                <p className="text-muted-foreground text-xs">
                  {formatSize(r.sizeBytes)} · used in {r._count.applications}{" "}
                  {r._count.applications === 1 ? "application" : "applications"}{" "}
                  · {formatRelative(r.createdAt)}
                </p>
              </div>
              {!r.isDefault && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDefault(r.id)}
                  disabled={isPending}
                >
                  <Star className="size-4" />
                  Make default
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                aria-label="Delete resume"
                onClick={() => remove(r.id)}
                disabled={isPending}
              >
                <Trash2 className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
