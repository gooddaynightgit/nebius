import { describe, expect, it } from "vitest";
import { DAILY_MOMENT_LIMIT, isDailyMomentLimitReached, momentsSavedToday } from "./daily-limit";

const now = new Date("2026-10-25T10:00:00Z");
const at = (hoursAgo: number, id = `cap_${hoursAgo}`) => ({
  id,
  createdAt: new Date(now.getTime() - hoursAgo * 3600_000).toISOString(),
});

describe("daily moment limit", () => {
  it("is three a day", () => {
    expect(DAILY_MOMENT_LIMIT).toBe(3);
  });

  it("allows the first three moments", () => {
    expect(isDailyMomentLimitReached([], { now })).toBe(false);
    expect(isDailyMomentLimitReached([at(1), at(2)], { now })).toBe(false);
  });

  it("stops a fourth new moment", () => {
    expect(isDailyMomentLimitReached([at(1), at(2), at(3)], { now })).toBe(true);
  });

  it("still lets someone edit one of today's three", () => {
    const three = [at(1, "mom_a"), at(2, "mom_b"), at(3, "mom_c")];
    expect(isDailyMomentLimitReached(three, { now, replacingId: "mom_b" })).toBe(false);
    expect(isDailyMomentLimitReached(three, { now, replacingId: "mom_new" })).toBe(true);
  });

  it("ignores moments older than a day", () => {
    expect(momentsSavedToday([at(25), at(30), at(1)], now)).toBe(1);
  });
});
