import type { Metadata } from "next";
import { Briefcase, Plus } from "lucide-react";

import { ApplicationForm } from "@/components/applications/application-form";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { DashboardCharts } from "@/components/dashboard/dashboard-charts";
import { StatCards } from "@/components/dashboard/stat-cards";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { requireUserId } from "@/lib/auth/session";
import { getDashboardData } from "@/lib/services/analytics";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const userId = await requireUserId();
  const data = await getDashboardData(userId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Dashboard
        </h1>
        <p className="text-muted-foreground text-sm">
          Your job search at a glance.
        </p>
      </div>

      {!data.hasData ? (
        <EmptyState
          icon={Briefcase}
          title="Welcome to AI Job Tracker"
          description="Add your first application to start tracking your job search and unlock analytics."
          action={
            <ApplicationForm
              trigger={
                <Button>
                  <Plus className="size-4" />
                  New application
                </Button>
              }
            />
          }
        />
      ) : (
        <>
          <StatCards stats={data.stats} />
          <DashboardCharts
            overTime={data.overTime}
            distribution={data.distribution}
            funnel={data.funnel}
          />
          <ActivityFeed events={data.recentEvents} />
        </>
      )}
    </div>
  );
}
