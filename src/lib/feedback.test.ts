import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { FEEDBACK_LINES, FEEDBACK_PREFIX } from "./feedback";

describe("feedback ribbon", () => {
  it("keeps Jasmine's two lines, prefix, and GoodDayNight capitalization", () => {
    expect(FEEDBACK_LINES).toEqual([
      'Feedback: "Anyone can take a photo — GoodDayNight makes you notice what it was."',
      'Feedback: "The app doesn\'t just save your best moment — it rewires your whole day hunting for it."',
    ]);
    expect(FEEDBACK_LINES.every((line) => line.startsWith(`${FEEDBACK_PREFIX} `))).toBe(true);
    expect(FEEDBACK_LINES[0]).toContain("GoodDayNight");
    expect(FEEDBACK_LINES[0]).not.toContain("Gooddaynight");
  });

  it("mounts once from the root layout so every page gets the ribbon", () => {
    const layout = readFileSync(path.resolve("src/app/layout.tsx"), "utf8");
    const ribbon = readFileSync(path.resolve("src/components/FeedbackRibbon.tsx"), "utf8");
    const styles = readFileSync(path.resolve("src/app/globals.css"), "utf8");
    expect(layout).toMatch(/<FeedbackRibbon\s*\/>/);
    expect(ribbon).toMatch(/FEEDBACK_LINES/);
    expect(styles).toMatch(/@keyframes feedback-marquee/);
    expect(styles).toMatch(/prefers-reduced-motion:\s*reduce/);
    expect(styles).toMatch(/\.feedback-ribbon/);
  });
});
