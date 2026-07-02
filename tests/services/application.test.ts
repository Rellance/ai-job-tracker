import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    application: {
      findMany: vi.fn(),
      count: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));
vi.mock("@/lib/events", () => ({ emitActivity: vi.fn() }));

import { db } from "@/lib/db";
import { emitActivity } from "@/lib/events";
import {
  createApplication,
  deleteApplication,
  listApplications,
  updateApplication,
} from "@/lib/services/application";
import {
  applicationCreateSchema,
  applicationFilterSchema,
} from "@/lib/validations/application";

const findMany = vi.mocked(db.application.findMany);
const count = vi.mocked(db.application.count);
const findFirst = vi.mocked(db.application.findFirst);
const create = vi.mocked(db.application.create);
const update = vi.mocked(db.application.update);
const del = vi.mocked(db.application.delete);
const emit = vi.mocked(emitActivity);

beforeEach(() => vi.clearAllMocks());

function firstWhere(): Record<string, unknown> {
  const arg = findMany.mock.calls[0]?.[0] as
    { where?: Record<string, unknown> } | undefined;
  return arg?.where ?? {};
}

describe("listApplications", () => {
  it("scopes by userId, applies filters, and builds a search OR", async () => {
    findMany.mockResolvedValue([] as never);
    count.mockResolvedValue(0 as never);

    const filters = applicationFilterSchema.parse({
      q: "acme",
      status: "APPLIED",
    });
    const res = await listApplications("u1", filters);

    expect(res.pageCount).toBe(1);
    const where = firstWhere();
    expect(where.userId).toBe("u1");
    expect(where.status).toBe("APPLIED");
    expect(where.OR).toHaveLength(3);
  });
});

describe("createApplication", () => {
  it("creates the row and emits APPLICATION_CREATED", async () => {
    create.mockResolvedValue({
      id: "a1",
      company: "Acme",
      title: "Eng",
    } as never);

    const input = applicationCreateSchema.parse({
      company: "Acme",
      title: "Eng",
    });
    await createApplication("u1", input);

    expect(create).toHaveBeenCalledOnce();
    expect(emit).toHaveBeenCalledWith(
      "u1",
      "APPLICATION_CREATED",
      expect.anything(),
    );
  });
});

describe("updateApplication", () => {
  it("returns null for another user's application", async () => {
    findFirst.mockResolvedValue(null as never);
    const res = await updateApplication("u1", "x", { title: "New" });
    expect(res).toBeNull();
    expect(update).not.toHaveBeenCalled();
  });

  it("emits STATUS_CHANGED only when status actually changes", async () => {
    findFirst.mockResolvedValue({ id: "a1", status: "WISHLIST" } as never);
    update.mockResolvedValue({ id: "a1" } as never);

    await updateApplication("u1", "a1", { status: "APPLIED" });

    expect(emit).toHaveBeenCalledWith(
      "u1",
      "STATUS_CHANGED",
      expect.objectContaining({
        metadata: { from: "WISHLIST", to: "APPLIED" },
      }),
    );
  });
});

describe("deleteApplication", () => {
  it("won't delete an application the user doesn't own", async () => {
    findFirst.mockResolvedValue(null as never);
    const res = await deleteApplication("u1", "x");
    expect(res).toBeNull();
    expect(del).not.toHaveBeenCalled();
  });
});
