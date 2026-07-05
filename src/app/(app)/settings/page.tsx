import type { Metadata } from "next";
import { CreditCard } from "lucide-react";

import { ActivityFeed } from "@/components/dashboard/activity-feed";
import {
  ChangePasswordForm,
  ProfileForm,
} from "@/components/settings/settings-forms";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { getQuota } from "@/lib/services/quota";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await requireUser();
  const [quota, events, dbUser] = await Promise.all([
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
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CreditCard className="size-4" />
                Plan & usage
              </CardTitle>
              <CardDescription>
                Stripe checkout (test-mode) lands later in M5 — usage tracking
                is already live.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-sm">Current plan:</span>
                <Badge>{quota.plan}</Badge>
              </div>
              {quota.limit !== null ? (
                <div className="max-w-sm space-y-1.5">
                  <div className="text-muted-foreground flex justify-between text-xs">
                    <span>AI actions this month</span>
                    <span className="tabular-nums">
                      {quota.used}/{quota.limit}
                    </span>
                  </div>
                  <Progress value={(quota.used / quota.limit) * 100} />
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">
                  Unlimited AI actions.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit" className="mt-4">
          <ActivityFeed events={events} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
