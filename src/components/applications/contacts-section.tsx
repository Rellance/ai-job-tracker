"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Mail, Phone, Plus, Trash2, User } from "lucide-react";
import { toast } from "sonner";

import {
  addContactAction,
  deleteContactAction,
} from "@/app/(app)/applications/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ContactItem = {
  id: string;
  name: string;
  role: string | null;
  email: string | null;
  phone: string | null;
};

export function ContactsSection({
  applicationId,
  contacts,
}: {
  applicationId: string;
  contacts: ContactItem[];
}) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", role: "", email: "" });
  const [isPending, startTransition] = useTransition();

  const save = () => {
    if (!form.name.trim()) return;
    startTransition(async () => {
      const res = await addContactAction({ applicationId, ...form });
      if (res.ok) {
        setForm({ name: "", role: "", email: "" });
        setAdding(false);
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  };

  const remove = (id: string) =>
    startTransition(async () => {
      await deleteContactAction(id, applicationId);
      router.refresh();
    });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Contacts</h3>
        {!adding && (
          <Button variant="ghost" size="sm" onClick={() => setAdding(true)}>
            <Plus className="size-4" /> Add
          </Button>
        )}
      </div>

      {contacts.length === 0 && !adding && (
        <p className="text-muted-foreground text-sm">
          No recruiters or referrals added yet.
        </p>
      )}

      <ul className="space-y-2">
        {contacts.map((c) => (
          <li
            key={c.id}
            className="flex items-start justify-between gap-2 rounded-lg border p-3"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-sm font-medium">
                <User className="text-muted-foreground size-4" />
                {c.name}
                {c.role && (
                  <span className="text-muted-foreground font-normal">
                    · {c.role}
                  </span>
                )}
              </div>
              <div className="text-muted-foreground mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                {c.email && (
                  <span className="inline-flex items-center gap-1">
                    <Mail className="size-3" />
                    {c.email}
                  </span>
                )}
                {c.phone && (
                  <span className="inline-flex items-center gap-1">
                    <Phone className="size-3" />
                    {c.phone}
                  </span>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              aria-label="Delete contact"
              onClick={() => remove(c.id)}
              disabled={isPending}
            >
              <Trash2 className="size-4" />
            </Button>
          </li>
        ))}
      </ul>

      {adding && (
        <div className="space-y-3 rounded-lg border p-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="c-name">Name *</Label>
              <Input
                id="c-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-role">Role</Label>
              <Input
                id="c-role"
                placeholder="Recruiter"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-email">Email</Label>
              <Input
                id="c-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAdding(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={save}
              disabled={isPending || !form.name.trim()}
            >
              Save contact
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
