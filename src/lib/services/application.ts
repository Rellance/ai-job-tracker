import { ApplicationStatus, Prisma } from "@prisma/client";

import { db } from "@/lib/db";
import { emitActivity } from "@/lib/events";
import type {
  ApplicationCreateInput,
  ApplicationFilter,
  ApplicationUpdateInput,
} from "@/lib/validations/application";

const PAGE_SIZE = 10;

export async function listApplications(
  userId: string,
  filters: ApplicationFilter,
) {
  const where: Prisma.ApplicationWhereInput = { userId };
  if (filters.status) where.status = filters.status;
  if (filters.priority) where.priority = filters.priority;
  if (filters.source) where.source = filters.source;
  if (filters.q) {
    where.OR = [
      { company: { contains: filters.q, mode: "insensitive" } },
      { title: { contains: filters.q, mode: "insensitive" } },
      {
        notes: { some: { body: { contains: filters.q, mode: "insensitive" } } },
      },
    ];
  }

  const [items, total] = await Promise.all([
    db.application.findMany({
      where,
      orderBy: { [filters.sort]: filters.order },
      skip: (filters.page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        _count: { select: { notes: true, interviews: true } },
        interviews: {
          where: { status: "SCHEDULED", scheduledAt: { gte: new Date() } },
          orderBy: { scheduledAt: "asc" },
          take: 1,
        },
      },
    }),
    db.application.count({ where }),
  ]);

  return {
    items,
    total,
    page: filters.page,
    pageSize: PAGE_SIZE,
    pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}

export type ApplicationListItem = Awaited<
  ReturnType<typeof listApplications>
>["items"][number];

export async function listSources(userId: string): Promise<string[]> {
  const rows = await db.application.findMany({
    where: { userId, source: { not: null } },
    select: { source: true },
    distinct: ["source"],
    orderBy: { source: "asc" },
  });
  return rows.map((r) => r.source).filter((s): s is string => Boolean(s));
}

export async function getApplication(userId: string, id: string) {
  return db.application.findFirst({
    where: { id, userId },
    include: {
      notes: { orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }] },
      interviews: { orderBy: { scheduledAt: "asc" } },
      contacts: { orderBy: { createdAt: "asc" } },
      resume: true,
      coverLetter: true,
      aiArtifacts: { orderBy: { createdAt: "desc" } },
    },
  });
}

export type ApplicationDetail = NonNullable<
  Awaited<ReturnType<typeof getApplication>>
>;

export async function createApplication(
  userId: string,
  data: ApplicationCreateInput,
) {
  const appliedAt =
    data.appliedAt ??
    (data.status !== ApplicationStatus.WISHLIST ? new Date() : null);

  const app = await db.application.create({
    data: { ...data, appliedAt, userId },
  });
  await emitActivity(userId, "APPLICATION_CREATED", {
    entityType: "Application",
    entityId: app.id,
    metadata: { company: app.company, title: app.title },
  });
  return app;
}

export async function updateApplication(
  userId: string,
  id: string,
  data: ApplicationUpdateInput,
) {
  const existing = await db.application.findFirst({ where: { id, userId } });
  if (!existing) return null;

  const app = await db.application.update({ where: { id }, data });
  await emitActivity(userId, "APPLICATION_UPDATED", {
    entityType: "Application",
    entityId: id,
  });
  if (data.status && data.status !== existing.status) {
    await emitActivity(userId, "STATUS_CHANGED", {
      entityType: "Application",
      entityId: id,
      metadata: { from: existing.status, to: data.status },
    });
  }
  return app;
}

export async function deleteApplication(userId: string, id: string) {
  const existing = await db.application.findFirst({ where: { id, userId } });
  if (!existing) return null;

  await db.application.delete({ where: { id } });
  await emitActivity(userId, "APPLICATION_DELETED", {
    entityType: "Application",
    entityId: id,
    metadata: { company: existing.company },
  });
  return existing;
}

export async function moveApplication(
  userId: string,
  id: string,
  status: ApplicationStatus,
  boardOrder: number,
) {
  const existing = await db.application.findFirst({ where: { id, userId } });
  if (!existing) return null;

  const app = await db.application.update({
    where: { id },
    data: { status, boardOrder },
  });
  if (existing.status !== status) {
    await emitActivity(userId, "STATUS_CHANGED", {
      entityType: "Application",
      entityId: id,
      metadata: { from: existing.status, to: status },
    });
  }
  return app;
}
