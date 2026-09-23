import { describe, expect, it } from "vitest";
import { hasSavedGoodMoment } from "./saved-moment";

describe("hasSavedGoodMoment", () => {
  it("is true when today's photo, an opened YOURS, a story, or a phone stash exists", () => {
    expect(hasSavedGoodMoment({})).toBe(false);
    expect(hasSavedGoodMoment({ todayPhoto: null, lastStory: null, stash: null })).toBe(false);
    expect(hasSavedGoodMoment({ yoursOpened: true })).toBe(true);
    expect(hasSavedGoodMoment({ todayPhoto: { id: "photo" } as never })).toBe(true);
    expect(hasSavedGoodMoment({ lastStory: { id: "story" } as never })).toBe(true);
    expect(hasSavedGoodMoment({ stash: { day: "2026-09-23" } as never })).toBe(true);
  });
});
