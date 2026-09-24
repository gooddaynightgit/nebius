import { readFileSync } from "node:fs";
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
    expect(STORY_OPENING_INTERVAL_MS).toBe(5500);

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

  it("paints each line from lavender through green to warm, and snaps when motion is reduced", () => {
    const css = readFileSync(path.resolve("src/app/globals.css"), "utf8");
    const yours = readFileSync(path.resolve("src/components/YoursStory.tsx"), "utf8");
    expect(yours).toMatch(/data-line=\{index\}/);
    expect(yours).toMatch(/story-opening/);
    const block = css.match(/\.card\.story-opening \{[\s\S]*?prefers-reduced-motion: reduce\) \{\s*\.card\.story-opening \{\s*transition: none;\s*\}/)?.[0];
    expect(block).toBeTruthy();
    const colors = [...block!.matchAll(/data-line="(\d)"\] \{\s*background-color: (#[0-9a-f]+);/g)].map(
      (match) => match[2],
    );
    expect(colors).toEqual(["#ebe7fb", "#e7f6ea", "#d7f3e4", "#ffe7b0", "#f8ead6"]);
    expect(block).toMatch(/transition: background-color 1\.2s var\(--ease\)/);
    expect(block).toMatch(/color: var\(--navy\)/);
  });
});
