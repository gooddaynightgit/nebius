import { describe, expect, it } from "vitest";
import { SILK_RIBBONS, SILK_SLICES, silkBands, silkGradientShift } from "./silk-weave";

describe("silk weave", () => {
  it("draws between six and ten ribbons and morphs without a hard reset", () => {
    expect(SILK_RIBBONS.length).toBeGreaterThanOrEqual(6);
    expect(SILK_RIBBONS.length).toBeLessThanOrEqual(10);
    expect(SILK_SLICES.length).toBeGreaterThanOrEqual(3);
    const start = silkBands(0);
    const later = silkBands(3.4);
    expect(start).toHaveLength(SILK_RIBBONS.length);
    expect(later).toHaveLength(SILK_RIBBONS.length);
    const before = start.map((item) => item.d).join("|");
    const after = later.map((item) => item.d).join("|");
    expect(before).not.toBe(after);
    expect(before).not.toMatch(/NaN/);
    expect(after).not.toMatch(/NaN/);
    expect(before.split(/[MLQZ]/).length).toBeLessThan(800);
    expect(start.every((item) => item.glint.startsWith("M") && item.crease.startsWith("M"))).toBe(true);
    const shiftA = silkGradientShift(0, 0);
    const shiftB = silkGradientShift(0, 4);
    expect(shiftA.x1).not.toBe(shiftB.x1);
  });
});