import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    user: { findUniqueOrThrow: vi.fn(), update: vi.fn() },
  },
}));

import { computeCostCents } from "@/lib/ai/run";
import { TOOLS, TOOL_KINDS, toolBySlug } from "@/lib/ai/schemas";
import { db } from "@/lib/db";
import { computeInputHash } from "@/lib/services/aiArtifact";
import { getQuota, PLAN_LIMITS } from "@/lib/services/quota";

const findUser = vi.mocked(db.user.findUniqueOrThrow);
const updateUser = vi.mocked(db.user.update);

beforeEach(() => vi.clearAllMocks());

describe("computeInputHash", () => {
  it("is stable regardless of key order", () => {
    const a = computeInputHash("JD_ANALYSIS", { a: "1", b: "2" });
    const b = computeInputHash("JD_ANALYSIS", { b: "2", a: "1" });
    expect(a).toBe(b);
  });

  it("differs across kinds and inputs", () => {
    const base = computeInputHash("JD_ANALYSIS", { jobDescription: "x" });
    expect(computeInputHash("MATCH_SCORE", { jobDescription: "x" })).not.toBe(
      base,
    );
    expect(computeInputHash("JD_ANALYSIS", { jobDescription: "y" })).not.toBe(
      base,
    );
  });
});

describe("computeCostCents", () => {
  it("prices gpt-4o-mini correctly and rounds up", () => {
    // 1M in ($0.15) + 1M out ($0.60) = $0.75 → 75 cents
    expect(computeCostCents("gpt-4o-mini", 1_000_000, 1_000_000)).toBe(75);
    // tiny runs round up to 1 cent
    expect(computeCostCents("gpt-4o-mini", 1000, 500)).toBe(1);
  });

  it("returns 0 for unknown models", () => {
    expect(computeCostCents("mystery-model", 1000, 1000)).toBe(0);
  });
});

describe("tool registry", () => {
  it("resolves every slug and validates inputs", () => {
    for (const kind of TOOL_KINDS) {
      const tool = toolBySlug(TOOLS[kind].slug);
      expect(tool?.kind).toBe(kind);
    }
    expect(toolBySlug("nope")).toBeNull();

    const bad = TOOLS.JD_ANALYSIS.input.safeParse({ jobDescription: "short" });
    expect(bad.success).toBe(false);
  });
});

describe("getQuota", () => {
  it("blocks FREE users at the limit", async () => {
    findUser.mockResolvedValue({
      plan: "FREE",
      aiCreditsUsed: PLAN_LIMITS.FREE,
      aiCreditsReset: new Date(),
    } as never);

    const q = await getQuota("u1");
    expect(q.allowed).toBe(false);
    expect(q.remaining).toBe(0);
  });

  it("resets the window after a month", async () => {
    const old = new Date();
    old.setMonth(old.getMonth() - 2);
    findUser.mockResolvedValue({
      plan: "FREE",
      aiCreditsUsed: 10,
      aiCreditsReset: old,
    } as never);
    updateUser.mockResolvedValue({
      plan: "FREE",
      aiCreditsUsed: 0,
      aiCreditsReset: new Date(),
    } as never);

    const q = await getQuota("u1");
    expect(updateUser).toHaveBeenCalled();
    expect(q.allowed).toBe(true);
    expect(q.used).toBe(0);
  });

  it("never blocks PRO users", async () => {
    findUser.mockResolvedValue({
      plan: "PRO",
      aiCreditsUsed: 9999,
      aiCreditsReset: new Date(),
    } as never);

    const q = await getQuota("u1");
    expect(q.allowed).toBe(true);
    expect(q.limit).toBeNull();
  });
});
