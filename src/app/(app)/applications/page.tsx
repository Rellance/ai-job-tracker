import type { Metadata } from "next";
import Link from "next/link";
import { Briefcase, Plus } from "lucide-react";

import { ApplicationForm } from "@/components/applications/application-form";
import { ApplicationsTable } from "@/components/applications/applications-table";
import { FilterBar } from "@/components/applications/filter-bar";
import { EmptyState } from "@/components/shared/empty-state";
import { Button, buttonVariants } from "@/components/ui/button";
import { requireUserId } from "@/lib/auth/session";
import { listApplications, listSources } from "@/lib/services/application";
import { applicationFilterSchema } from "@/lib/validations/application";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Applications" };

type SearchParams = Record<string, string | string[] | undefined>;

function pageHref(sp: SearchParams, page: number): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (typeof v === "string" && k !== "page") p.set(k, v);
  }
  p.set("page", String(page));
  return `/applications?${p.toString()}`;
}

export default async function ApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const userId = await requireUserId();
  const sp = await searchParams;

  const parsed = applicationFilterSchema.safeParse({
    q: sp.q,
    status: sp.status,
    priority: sp.priority,
    source: sp.source,
    sort: sp.sort,
    order: sp.order,
    page: sp.page,
  });
  const filters = parsed.success
    ? parsed.data
    : applicationFilterSchema.parse({});

  const [result, sources] = await Promise.all([
    listApplications(userId, filters),
    listSources(userId),
  ]);
  const { items, total, page, pageCount } = result;

  const hasFilters = Boolean(sp.q || sp.status || sp.priority || sp.source);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Applications
          </h1>
          <p className="text-muted-foreground text-sm">
            {total} {total === 1 ? "application" : "applications"} tracked
          </p>
        </div>
        <ApplicationForm
          trigger={
            <Button>
              <Plus className="size-4" />
              New application
            </Button>
          }
        />
      </div>

      <FilterBar sources={sources} />

      {items.length === 0 ? (
        hasFilters ? (
          <EmptyState
            icon={Briefcase}
            title="No matches"
            description="No applications match your current filters. Try adjusting or clearing them."
          />
        ) : (
          <EmptyState
            icon={Briefcase}
            title="No applications yet"
            description="Add the first role you're interested in or have applied to."
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
        )
      ) : (
        <>
          <ApplicationsTable items={items} />

          {pageCount > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-muted-foreground text-sm">
                Page {page} of {pageCount}
              </p>
              <div className="flex gap-2">
                {page <= 1 ? (
                  <span
                    aria-disabled="true"
                    className={cn(
                      buttonVariants({ variant: "outline", size: "sm" }),
                      "pointer-events-none opacity-50",
                    )}
                  >
                    Previous
                  </span>
                ) : (
                  <Link
                    href={pageHref(sp, page - 1)}
                    className={buttonVariants({
                      variant: "outline",
                      size: "sm",
                    })}
                  >
                    Previous
                  </Link>
                )}
                {page >= pageCount ? (
                  <span
                    aria-disabled="true"
                    className={cn(
                      buttonVariants({ variant: "outline", size: "sm" }),
                      "pointer-events-none opacity-50",
                    )}
                  >
                    Next
                  </span>
                ) : (
                  <Link
                    href={pageHref(sp, page + 1)}
                    className={buttonVariants({
                      variant: "outline",
                      size: "sm",
                    })}
                  >
                    Next
                  </Link>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
