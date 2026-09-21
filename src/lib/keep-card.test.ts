import { describe, expect, it } from "vitest";
import {
  KEEP_CARD,
  canShareKeepCard,
  keepCardFilename,
  keepCardFile,
  keepCardPhotoSrc,
  layoutKeepCard,
  wrapKeepCardLines,
} from "./keep-card";

describe("keep card helpers", () => {
  it("names a JPEG for the calendar day and points at tonight’s photo", () => {
    expect(keepCardFilename("2026-09-21")).toBe("gooddaynight-2026-09-21.jpg");
    expect(keepCardPhotoSrc("cap_a")).toBe("/api/media/cap_a");
    expect(keepCardPhotoSrc("cap_a", "story_1")).toBe("/api/media/cap_a?t=story_1");
    expect(keepCardFile(new Blob(["x"], { type: "image/jpeg" }), "gooddaynight-2026-09-21.jpg").name).toBe(
      "gooddaynight-2026-09-21.jpg",
    );
    expect(canShareKeepCard(keepCardFile(new Blob(["x"]), "keep.jpg"))).toBe(false);
  });

  it("wraps the woven story to a phone-friendly width and lays out photo above it", () => {
    const measure = (line: string) => line.length * 10;
    const lines = wrapKeepCardLines(
      "Today the kettle caught the gold.\nYou kept it.",
      measure,
      180,
    );
    expect(lines.join(" ")).toMatch(/kettle/);
    expect(lines.join(" ")).toMatch(/kept it/);
    expect(lines.length).toBeGreaterThan(1);
    expect(wrapKeepCardLines("supercalifragilistic", measure, 40).every((line) => line.length <= 4)).toBe(
      true,
    );

    const layout = layoutKeepCard({ lineCount: 8 });
    expect(layout.width).toBe(KEEP_CARD.width);
    expect(layout.photo.y).toBeGreaterThan(layout.brandY);
    expect(layout.story.y).toBeGreaterThan(layout.photo.y + layout.photo.height);
    expect(layout.height).toBeGreaterThan(layout.story.y + layout.story.height);
    expect(layout.photo.height).toBe(Math.round(layout.photo.width * KEEP_CARD.photoRatio));
  });
});
