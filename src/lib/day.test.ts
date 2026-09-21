import { describe, expect, it } from "vitest";
import {
  dayFromUnixMsWithOffset,
  exifDateToDay,
  isPlausibleClientDay,
  isValidDayStamp,
  isValidTzOffset,
  localDay,
} from "./day";

describe("local day keys", () => {
  it("formats a local calendar day as YYYY-MM-DD", () => {
    expect(isValidDayStamp(localDay())).toBe(true);
    expect(isValidDayStamp("2026-09-21")).toBe(true);
    expect(isValidDayStamp("2026-13-01")).toBe(false);
  });

  it("accepts a client day within one UTC day of now", () => {
    const now = new Date("2026-09-21T15:00:00.000Z");
    expect(isPlausibleClientDay("2026-09-21", now)).toBe(true);
    expect(isPlausibleClientDay("2026-09-20", now)).toBe(true);
    expect(isPlausibleClientDay("2026-09-22", now)).toBe(true);
    expect(isPlausibleClientDay("2026-09-18", now)).toBe(false);
  });

  it("reads EXIF datetime prefixes and phone offsets", () => {
    expect(exifDateToDay("2026:09:21 07:04:00")).toBe("2026-09-21");
    expect(isValidTzOffset(420)).toBe(true);
    expect(isValidTzOffset(9000)).toBe(false);
    expect(dayFromUnixMsWithOffset(Date.parse("2026-09-21T07:00:00.000Z"), 0)).toBe("2026-09-21");
    expect(dayFromUnixMsWithOffset(Date.parse("2026-09-21T07:00:00.000Z"), 420)).toBe("2026-09-21");
  });
});
