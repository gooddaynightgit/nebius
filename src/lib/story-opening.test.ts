import { readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  STORY_OPENING_INTERVAL_MS,
  STORY_OPENING_LINES,
  nextStoryOpeningIndex,
} from "./story-opening";

describe("story opening status", () => {
  it("uses Jasmine's lines in order and holds on the last", () => {
    expect([...STORY_OPENING_LINES]).toEqual([
      "Something good is coming my way",
      "Quiet joys worth keeping",
      "Finding my good moment is changing me",
      "Letting the habit of looking rewire how I feel",
      "Your good moment story is being carefully weaved, thank you for your patience.",
    ]);
    expect(STORY_OPENING_INTERVAL_MS).toBe(9000);

    let index = 0;
    const seen = [STORY_OPENING_LINES[index]];
    for (let step = 0; step < 8; step += 1) {
      index = nextStoryOpeningIndex(index);
      seen.push(STORY_OPENING_LINES[index]);
    }
    expect(seen).toEqual([
      "Something good is coming my way",
      "Quiet joys worth keeping",
      "Finding my good moment is changing me",
      "Letting the habit of looking rewire how I feel",
      "Your good moment story is being carefully weaved, thank you for your patience.",
      "Your good moment story is being carefully weaved, thank you for your patience.",
      "Your good moment story is being carefully weaved, thank you for your patience.",
      "Your good moment story is being carefully weaved, thank you for your patience.",
      "Your good moment story is being carefully weaved, thank you for your patience.",
    ]);
    expect(nextStoryOpeningIndex(STORY_OPENING_LINES.length - 1)).toBe(
      STORY_OPENING_LINES.length - 1,
    );
  });

  it("holds the silk still behind readable text, and flows it only while weaving", () => {
    const css = readFileSync(path.resolve("src/app/globals.css"), "utf8");
    const yours = readFileSync(path.resolve("src/components/YoursStory.tsx"), "utf8");
    const silk = readFileSync(path.resolve("src/components/WeaveSilk.tsx"), "utf8");
    expect(yours).toMatch(/data-line=\{index\}/);
    expect(yours).toMatch(/story-opening/);
    expect(yours).toMatch(/<WeaveSilk \/>/);
    expect(yours).toMatch(/className="card__body silk-frost"/);
    expect(silk).toMatch(/baseFrequency="0.005"/);
    expect(silk).toMatch(/numOctaves="2"/);
    expect(silk).toMatch(/values="0.004;0.0075;0.004"/);
    expect(silk).toMatch(/feDisplacementMap[\s\S]*scale="32"/);
    expect(css).toMatch(/background-size:\s*cover/);
    expect(css).toMatch(/background-position:\s*center/);
    expect(css).toMatch(/rgba\(255,\s*255,\s*255,\s*0\.66\)/);
    expect(css).toMatch(/backdrop-filter:\s*blur\(14px\)/);
    expect(css).toMatch(/weave-silk-pan 26s ease-in-out infinite alternate/);
    expect(css).toMatch(/@supports \(-webkit-touch-callout: none\)[\s\S]*?filter:\s*none/);
    expect(css).toMatch(/prefers-reduced-motion: reduce\) \{\s*\.weave-silk--flow \{\s*display: none;\s*\}/);
    expect(statSync(path.resolve("public/weave-silk.webp")).size).toBeLessThan(300 * 1024);
    expect(statSync(path.resolve("public/weave-silk.jpg")).size).toBeLessThan(300 * 1024);
  });
});
