import { ApplicationStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";

import {
  BOARD_COLUMNS,
  STATUS_META,
  STATUS_ORDER,
} from "@/lib/applications/meta";

describe("application status metadata", () => {
  it("covers all nine statuses", () => {
    expect(STATUS_ORDER).toHaveLength(9);
    expect(Object.keys(STATUS_META)).toHaveLength(
      Object.keys(ApplicationStatus).length,
    );
  });

  it("maps every status onto a real board column", () => {
    const columns = new Set(BOARD_COLUMNS.map((c) => c.id));
    for (const status of STATUS_ORDER) {
      expect(columns.has(STATUS_META[status].column)).toBe(true);
    }
  });
});
