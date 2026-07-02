"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { NoteType } from "@prisma/client";
import { Pin, PinOff, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  addNoteAction,
  deleteNoteAction,
  toggleNotePinAction,
} from "@/app/(app)/applications/actions";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatRelative } from "@/lib/utils/format";

type NoteItem = {
  id: string;
  type: NoteType;
  body: string;
  pinned: boolean;
  updatedAt: Date | string;
};

const NOTE_TYPE_LABEL: Record<NoteType, string> = {
  GENERAL: "General",
  INTERVIEW: "Interview",
  FOLLOW_UP: "Follow-up",
};

const noteTypeItems = (Object.keys(NOTE_TYPE_LABEL) as NoteType[]).map((t) => ({
  value: t,
  label: NOTE_TYPE_LABEL[t],
}));

export function NotesTab({
  applicationId,
  notes,
}: {
  applicationId: string;
  notes: NoteItem[];
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [type, setType] = useState<NoteType>(NoteType.GENERAL);
  const [isPending, startTransition] = useTransition();

  const add = () => {
    if (!body.trim()) return;
    startTransition(async () => {
      const res = await addNoteAction({ applicationId, type, body });
      if (res.ok) {
        setBody("");
        setType(NoteType.GENERAL);
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  };

  const togglePin = (id: string) =>
    startTransition(async () => {
      await toggleNotePinAction(id, applicationId);
      router.refresh();
    });

  const remove = (id: string) =>
    startTransition(async () => {
      await deleteNoteAction(id, applicationId);
      router.refresh();
    });

  return (
    <div className="space-y-6">
      <div className="space-y-3 rounded-lg border p-4">
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          placeholder="Add a note — interview feedback, follow-up reminders, questions to ask…"
        />
        <div className="flex items-center justify-between gap-2">
          <Select value={type} onValueChange={(v) => setType(v as NoteType)}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {noteTypeItems.map((it) => (
                <SelectItem key={it.value} value={it.value}>
                  {it.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={add} disabled={isPending || !body.trim()}>
            Add note
          </Button>
        </div>
      </div>

      {notes.length === 0 ? (
        <EmptyState
          title="No notes yet"
          description="Notes you add show up here, pinned ones first."
        />
      ) : (
        <ul className="space-y-3">
          {notes.map((note) => (
            <li key={note.id} className="rounded-lg border p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">
                    {NOTE_TYPE_LABEL[note.type]}
                  </Badge>
                  {note.pinned && (
                    <span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
                      <Pin className="size-3" /> Pinned
                    </span>
                  )}
                  <span className="text-muted-foreground text-xs">
                    {formatRelative(note.updatedAt)}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    aria-label={note.pinned ? "Unpin note" : "Pin note"}
                    onClick={() => togglePin(note.id)}
                    disabled={isPending}
                  >
                    {note.pinned ? (
                      <PinOff className="size-4" />
                    ) : (
                      <Pin className="size-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    aria-label="Delete note"
                    onClick={() => remove(note.id)}
                    disabled={isPending}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
              <p className="mt-2 text-sm whitespace-pre-wrap">{note.body}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
