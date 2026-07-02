import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, Pencil } from "lucide-react";

import { ApplicationForm } from "@/components/applications/application-form";
import { ContactsSection } from "@/components/applications/contacts-section";
import { NotesTab } from "@/components/applications/notes-tab";
import { PriorityBadge } from "@/components/applications/priority-badge";
import { StatusPill } from "@/components/applications/status-pill";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { requireUserId } from "@/lib/auth/session";
import { getApplication } from "@/lib/services/application";
import { formatDate, formatSalary } from "@/lib/utils/format";

export const metadata: Metadata = { title: "Application" };

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="mt-0.5 text-sm">{value}</dd>
    </div>
  );
}

export default async function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const userId = await requireUserId();
  const app = await getApplication(userId, id);
  if (!app) notFound();

  return (
    <div className="space-y-6">
      <Link
        href="/applications"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
      >
        <ArrowLeft className="size-4" />
        Applications
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            {app.company}
          </h1>
          <p className="text-muted-foreground">{app.title}</p>
          <div className="flex items-center gap-2">
            <StatusPill status={app.status} />
            <PriorityBadge priority={app.priority} />
          </div>
        </div>
        <ApplicationForm
          application={app}
          trigger={
            <Button variant="outline">
              <Pencil className="size-4" />
              Edit
            </Button>
          }
        />
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="notes">Notes ({app.notes.length})</TabsTrigger>
          <TabsTrigger value="interviews">
            Interviews ({app.interviews.length})
          </TabsTrigger>
          <TabsTrigger value="ai">
            AI Insights ({app.aiArtifacts.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                    <Field label="Location" value={app.location ?? "—"} />
                    <Field
                      label="Salary"
                      value={
                        formatSalary(
                          app.salaryMin,
                          app.salaryMax,
                          app.currency,
                        ) ?? "—"
                      }
                    />
                    <Field label="Source" value={app.source ?? "—"} />
                    <Field label="Applied" value={formatDate(app.appliedAt)} />
                    <Field label="Added" value={formatDate(app.createdAt)} />
                    <Field
                      label="Job posting"
                      value={
                        app.jobUrl ? (
                          <a
                            href={app.jobUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary inline-flex items-center gap-1 hover:underline"
                          >
                            Open <ExternalLink className="size-3" />
                          </a>
                        ) : (
                          "—"
                        )
                      }
                    />
                  </dl>
                </CardContent>
              </Card>

              {app.jobDescription && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Job description</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm whitespace-pre-wrap">
                      {app.jobDescription}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>

            <Card>
              <CardContent className="pt-6">
                <ContactsSection
                  applicationId={app.id}
                  contacts={app.contacts}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="notes" className="mt-4">
          <NotesTab applicationId={app.id} notes={app.notes} />
        </TabsContent>

        <TabsContent value="interviews" className="mt-4">
          {app.interviews.length === 0 ? (
            <EmptyState
              title="No interviews scheduled"
              description="Interview scheduling and calendar sync arrive in the next milestone (M3)."
            />
          ) : (
            <ul className="space-y-2">
              {app.interviews.map((iv) => (
                <li
                  key={iv.id}
                  className="flex items-center justify-between rounded-lg border p-3 text-sm"
                >
                  <span className="font-medium">
                    {iv.type.replaceAll("_", " ")}
                  </span>
                  <span className="text-muted-foreground">
                    {formatDate(iv.scheduledAt)}
                  </span>
                  <Badge variant="secondary">{iv.status}</Badge>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="ai" className="mt-4">
          {app.aiArtifacts.length === 0 ? (
            <EmptyState
              title="No AI insights yet"
              description="The AI Workspace (JD analysis, resume gap, cover letters, interview prep) arrives in M4."
            />
          ) : (
            <ul className="space-y-2">
              {app.aiArtifacts.map((a) => (
                <li
                  key={a.id}
                  className="flex items-center justify-between rounded-lg border p-3 text-sm"
                >
                  <span className="font-medium">
                    {a.kind.replaceAll("_", " ")}
                  </span>
                  <Badge variant="secondary">{a.status}</Badge>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
