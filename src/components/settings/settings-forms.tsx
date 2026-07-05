"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  changePasswordAction,
  updateProfileAction,
} from "@/app/(app)/settings/actions";
import { PasswordInput } from "@/components/auth/password-input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ProfileForm({
  initialName,
  email,
}: {
  initialName: string;
  email: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [isPending, startTransition] = useTransition();

  const save = () =>
    startTransition(async () => {
      const res = await updateProfileAction({ name });
      if (res.ok) {
        toast.success(res.message);
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Profile</CardTitle>
        <CardDescription>How you appear in the app.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="p-name">Name</Label>
            <Input
              id="p-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="p-email">Email</Label>
            <Input id="p-email" value={email} disabled />
          </div>
        </div>
        <Button
          onClick={save}
          disabled={isPending || !name.trim() || name === initialName}
        >
          {isPending ? "Saving…" : "Save changes"}
        </Button>
      </CardContent>
    </Card>
  );
}

export function ChangePasswordForm() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [isPending, startTransition] = useTransition();

  const save = () =>
    startTransition(async () => {
      const res = await changePasswordAction({ current, next });
      if (res.ok) {
        toast.success(res.message);
        setCurrent("");
        setNext("");
      } else {
        toast.error(res.error);
      }
    });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Change password</CardTitle>
        <CardDescription>
          At least 8 characters with a letter and a number.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="pw-current">Current password</Label>
            <PasswordInput
              id="pw-current"
              autoComplete="current-password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pw-next">New password</Label>
            <PasswordInput
              id="pw-next"
              autoComplete="new-password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
            />
          </div>
        </div>
        <Button onClick={save} disabled={isPending || !current || !next}>
          {isPending ? "Updating…" : "Update password"}
        </Button>
      </CardContent>
    </Card>
  );
}
