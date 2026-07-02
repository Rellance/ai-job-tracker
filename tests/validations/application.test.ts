import { describe, expect, it } from "vitest";

import {
  applicationCreateSchema,
  applicationFilterSchema,
} from "@/lib/validations/application";

describe("applicationCreateSchema", () => {
  it("requires company and title", () => {
    const r = applicationCreateSchema.safeParse({ company: "", title: "" });
    expect(r.success).toBe(false);
  });

  it("applies sensible defaults", () => {
    const r = applicationCreateSchema.parse({ company: "Acme", title: "Eng" });
    expect(r.status).toBe("WISHLIST");
    expect(r.priority).toBe("MEDIUM");
    expect(r.currency).toBe("USD");
  });

  it("coerces salary strings and turns blanks into undefined", () => {
    const r = applicationCreateSchema.parse({
      company: "Acme",
      title: "Eng",
      salaryMin: "50000",
      salaryMax: "",
      location: "",
    });
    expect(r.salaryMin).toBe(50000);
    expect(r.salaryMax).toBeUndefined();
    expect(r.location).toBeUndefined();
  });

  it("rejects an invalid job URL", () => {
    const r = applicationCreateSchema.safeParse({
      company: "Acme",
      title: "Eng",
      jobUrl: "not-a-url",
    });
    expect(r.success).toBe(false);
  });
});

describe("applicationFilterSchema", () => {
  it("defaults sort, order and page", () => {
    const r = applicationFilterSchema.parse({});
    expect(r.sort).toBe("createdAt");
    expect(r.order).toBe("desc");
    expect(r.page).toBe(1);
  });

  it("coerces page and ignores an empty query", () => {
    const r = applicationFilterSchema.parse({ page: "3", q: "" });
    expect(r.page).toBe(3);
    expect(r.q).toBeUndefined();
  });
});
