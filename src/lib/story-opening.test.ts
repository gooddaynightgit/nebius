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

  it("fills the weaving screen with a silk shader and a lighter finished-card frost", () => {
    const css = readFileSync(path.resolve("src/app/globals.css"), "utf8");
    const yours = readFileSync(path.resolve("src/components/YoursStory.tsx"), "utf8");
    const silk = readFileSync(path.resolve("src/components/WeaveSilk.tsx"), "utf8");
    const shader = readFileSync(path.resolve("src/lib/silk-shader.ts"), "utf8");
    expect(yours).toMatch(/data-line=\{index\}/);
    expect(yours).toMatch(/story-opening/);
    expect(yours).toMatch(/<WeaveSilk \/>/);
    const opening = yours.match(/function StoryOpeningStatus\(\) \{[\s\S]*?\n\}/)?.[0] ?? "";
    expect(opening).toMatch(/className="card__body story-opening__line"/);
    expect(opening).not.toMatch(/silk-frost/);
    expect(silk).toMatch(/requestAnimationFrame/);
    expect(silk).toMatch(/visibilitychange/);
    expect(silk).toMatch(/webglcontextlost/);
    expect(silk).toMatch(/prefers-reduced-motion: reduce/);
    expect(silk).toMatch(/Math\.min\(window\.devicePixelRatio \|\| 1, MAX_DPR\)/);
    expect(silk).toMatch(/MAX_DPR = 1\.5/);
    expect(shader).toMatch(/fbm\(/);
    expect(shader).toMatch(/vec2 warp/);
    expect(shader).toMatch(/pow\(ndh, 1[0-9][0-9]\.0\)/);
    expect(shader).toMatch(/#C9B6F2/);
    expect(shader).toMatch(/#F4B8E4/);
    expect(shader).toMatch(/#A98BF0/);
    expect(shader).toMatch(/#9FE6EE/);
    expect(shader).toMatch(/#B7DDFB/);
    expect(shader).toMatch(/#FFF1A8/);
    expect(shader).toMatch(/#6F5FC8/);
    expect(css).toMatch(/\.card\.story-opening \{[^}]*position:\s*fixed;/);
    expect(css).toMatch(/\.story-opening__line \{[^}]*text-shadow:/);
    expect(css).toMatch(/rgba\(255,\s*255,\s*255,\s*0\.35\)/);
    expect(css).toMatch(/backdrop-filter:\s*blur\(14px\)/);
    expect(css).toMatch(/weave-silk\.webp/);
    expect(css).toMatch(/background-size:\s*cover/);
    expect(statSync(path.resolve("public/weave-silk.webp")).size).toBeLessThan(300 * 1024);
    expect(statSync(path.resolve("public/weave-silk.jpg")).size).toBeLessThan(300 * 1024);
  });
});
