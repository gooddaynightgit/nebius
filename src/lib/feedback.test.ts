import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { FEEDBACK_LINES } from "./feedback";

describe("feedback ribbon", () => {
  it("keeps both quotes, drops the Feedback prefix, and names the speakers", () => {
    expect(FEEDBACK_LINES).toEqual([
      {
        quote: '"Anyone can take a photo — GoodDayNight makes you notice what it was."',
        attribution: "— early user",
      },
      {
        quote: '"The app doesn\'t just save your best moment — it rewires your whole day hunting for it."',
        attribution: "— Kim, beta tester",
      },
    ]);
    expect(FEEDBACK_LINES[0].quote).toContain("GoodDayNight");
    expect(FEEDBACK_LINES[0].quote).not.toContain("Gooddaynight");
    const ribbon = readFileSync(path.resolve("src/components/FeedbackRibbon.tsx"), "utf8");
    expect(ribbon).not.toMatch(/Feedback:/);
    expect(ribbon).toMatch(/feedback-ribbon__label/);
    const styles = readFileSync(path.resolve("src/app/globals.css"), "utf8");
    expect(styles).toMatch(/\.feedback-ribbon__quote \{[^}]*color:\s*#f4f7fb/);
    expect(styles).toMatch(/\.feedback-ribbon__label \{[^}]*color:\s*#d4ff00/);
    expect(styles).toMatch(/\.feedback-ribbon__group \{[^}]*gap:\s*4rem/);
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