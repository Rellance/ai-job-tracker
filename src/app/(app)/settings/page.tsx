import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { BillingPanel } from "@/components/settings/billing-panel";
import {
  ChangePasswordForm,
  ProfileForm,
} from "@/components/settings/settings-forms";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { requireUser } from "@/lib/auth/session";
import { confirmCheckoutSession } from "@/lib/billing";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { getQuota } from "@/lib/services/quota";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const user = await requireUser();
  const { session_id: sessionId } = await searchParams;

  // Back from Stripe Checkout: verify + sync, then clean the URL.
  if (sessionId) {
    await confirmCheckoutSession(user.id, sessionId).catch(() => false);
    redirect("/settings?upgraded=1");
  }

  const [quota, events, dbUser, subscription] = await Promise.all([
    getQuota(user.id),
    db.activityEvent.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    db.user.findUniqueOrThrow({
      where: { id: user.id },
      select: { name: true, email: true },
    }),
    db.subscription.findUnique({ where: { userId: user.id } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Settings
        </h1>
        <p className="text-muted-foreground text-sm">
          Account, security, plan and audit history.
        </p>
      </div>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
          <TabsTrigger value="audit">Audit log</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-4">
          <ProfileForm initialName={dbUser.name ?? ""} email={dbUser.email} />
        </TabsContent>

        <TabsContent value="security" className="mt-4">
          <ChangePasswordForm />
        </TabsContent>

        <TabsContent value="billing" className="mt-4">
          <BillingPanel
            plan={quota.plan}
            used={quota.used}
            limit={quota.limit}
            cancelAtPeriodEnd={subscription?.cancelAtPeriodEnd ?? false}
            currentPeriodEnd={
              subscription?.currentPeriodEnd?.toISOString() ?? null
            }
            stripeConfigured={Boolean(env.STRIPE_SECRET_KEY)}
          />
        </TabsContent>

        <TabsContent value="audit" className="mt-4">
          <ActivityFeed events={events} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
