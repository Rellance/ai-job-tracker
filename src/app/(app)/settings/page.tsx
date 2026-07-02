import type { Metadata } from "next";
import { Settings as SettingsIcon } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await requireUser();
  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-semibold tracking-tight">
        Settings
      </h1>
      <div className="rounded-lg border p-4">
        <h2 className="text-sm font-medium">Profile</h2>
        <dl className="mt-3 grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-muted-foreground text-xs">Name</dt>
            <dd>{user.name ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs">Email</dt>
            <dd>{user.email}</dd>
          </div>
        </dl>
      </div>
      <EmptyState
        icon={SettingsIcon}
        title="Security & Billing coming soon"
        description="Change password, manage your plan (Stripe), and view your audit log — M1/M5."
      />
    </div>
  );
}
