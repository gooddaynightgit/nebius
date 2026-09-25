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

  it("crossfades silk photos on the weaving screen and keeps a lighter finished-card frost", () => {
    const css = readFileSync(path.resolve("src/app/globals.css"), "utf8");
    const yours = readFileSync(path.resolve("src/components/YoursStory.tsx"), "utf8");
    const photos = readFileSync(path.resolve("src/components/WeavePhotos.tsx"), "utf8");
    expect(yours).toMatch(/data-line=\{index\}/);
    expect(yours).toMatch(/story-opening/);
    expect(yours).toMatch(/<WeavePhotos \/>/);
    const opening = yours.match(/function StoryOpeningStatus\(\) \{[\s\S]*?\n\}/)?.[0] ?? "";
    expect(opening).toMatch(/className="card__body story-opening__line"/);
    expect(opening).not.toMatch(/silk-frost/);
    expect(photos).toMatch(/SILK_LAYERS = \[1, 2, 3, 4\]/);
    expect(photos).toMatch(/\/weave-silk-\$\{layer\}\.webp/);
    expect(photos).toMatch(/\/weave-silk-\$\{layer\}\.jpg/);
    expect(photos).not.toMatch(/webgl|canvas|getContext/i);
    expect(css).not.toMatch(/\.weave-silk \{/);
    expect(css).toMatch(/object-fit:\s*cover/);
    expect(css).toMatch(/@keyframes weave-fade/);
    expect(css).toMatch(/animation-duration:\s*20s/);
    expect(css).toMatch(/scale\(1\.0[5-9]\)|scale\(1\.1[0-9]\)|scale\(1\.2\)/);
    expect(css).toMatch(/@keyframes weave-glow/);
    expect(css).toMatch(/prefers-reduced-motion:\s*reduce/);
    expect(css).toMatch(/\.weave-photos__layer--1 \{[^}]*opacity:\s*1/);
    expect(css).toMatch(/\.card\.story-opening \{[^}]*position:\s*fixed;/);
    expect(css).toMatch(/\.story-opening__line \{[^}]*text-shadow:/);
    expect(css).toMatch(/rgba\(255,\s*255,\s*255,\s*0\.35\)/);
    expect(css).toMatch(/backdrop-filter:\s*blur\(14px\)/);
    expect(css).toMatch(/weave-silk\.webp/);
    expect(css).toMatch(/background-size:\s*cover/);
    expect(statSync(path.resolve("public/weave-silk.webp")).size).toBeLessThan(300 * 1024);
    expect(statSync(path.resolve("public/weave-silk.jpg")).size).toBeLessThan(300 * 1024);
    for (const layer of [1, 2, 3, 4]) {
      expect(statSync(path.resolve(`public/weave-silk-${layer}.webp`)).size).toBeLessThan(200 * 1024);
      expect(statSync(path.resolve(`public/weave-silk-${layer}.jpg`)).size).toBeLessThan(200 * 1024);
    }
    expect(() => statSync(path.resolve("src/lib/silk-shader.ts"))).toThrow();
    expect(() => statSync(path.resolve("src/components/WeaveSilk.tsx"))).toThrow();
  });
});
