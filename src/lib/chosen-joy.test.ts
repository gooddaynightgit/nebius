import { afterEach, describe, expect, it } from "vitest";
import { readChosenJoy, resetChosenJoyForTests, writeChosenJoy } from "./chosen-joy";

afterEach(() => {
  resetChosenJoyForTests();
});

describe("chosen joy", () => {
  it("remembers the joy picked for today and ignores another day", () => {
    writeChosenJoy("2026-09-23", "morning-sunlight");
    expect(readChosenJoy("2026-09-23")).toBe("morning-sunlight");
    expect(readChosenJoy("2026-09-24")).toBeNull();
    writeChosenJoy("2026-09-23", "just-this");
    expect(readChosenJoy("2026-09-23")).toBe("just-this");
    writeChosenJoy("2026-09-23", "saved-joy-moments");
    expect(readChosenJoy("2026-09-23")).toBe("just-this");
  });
});
