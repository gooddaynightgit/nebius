import { describe, expect, it } from "vitest";
import {
  KEEPSAKE_CLOSING_LINES,
  closingLineForStory,
  displayKeepsakeText,
  keptClosingLine,
  pickClosingLine,
  splitKeepsakeClosing,
  stripTrailingClosing,
  withClosingLine,
} from "./affirmation";
import { hasDiminishingPhrase, stripDiminishingPhrases } from "./diminish";
import { toFirstPersonStory } from "./first-person";

const STORY =
  "Today, I kept the chocolate in the golden morning light. A good moment, woven quietly into the fabric of my life. This is what it means to be alive.";

const RADIANT = KEEPSAKE_CLOSING_LINES[1];

describe("keepsake closing lines", () => {
  it("picks one saved line from the list and keeps the blank line", () => {
    expect(KEEPSAKE_CLOSING_LINES).toHaveLength(10);
    expect(KEEPSAKE_CLOSING_LINES[0]).toBe(
      "I love this moment. It's beautiful \u2013 the joy and awe of being.",
    );
    expect(pickClosingLine(() => 0.125)).toBe(RADIANT);
    const out = withClosingLine(STORY, () => 0.125);
    expect(out).toBe(`${STORY}\n\n${RADIANT}`);
    const parts = splitKeepsakeClosing(out);
    expect(parts.story).toBe(STORY);
    expect(parts.closing).toBe(RADIANT);
    expect(withClosingLine(out, () => 0.125)).toBe(out);
  });

  it("strips a model-written copy of any list line before appending", () => {
    const copied = `${STORY}\n\nI embrace this moment. It\u2019s breathtaking - the joy and awe of simply being.`;
    expect(stripTrailingClosing(copied)).toBe(STORY);
    expect(keptClosingLine(copied)).toBe(KEEPSAKE_CLOSING_LINES[5]);
    expect(withClosingLine(copied, () => 0)).toBe(`${STORY}\n\n${KEEPSAKE_CLOSING_LINES[0]}`);
  });

  it("keeps a saved list line and replaces an old four-sentence close from the story id", () => {
    const saved = `${STORY}\n\n${RADIANT}`;
    expect(displayKeepsakeText(saved, "story_other")).toBe(saved);

    const old = `${STORY}\n\nI treasure this moment. It's radiant. I let go. I am brave.`;
    const shown = displayKeepsakeText(old, "story_42");
    expect(shown).toBe(`${STORY}\n\n${closingLineForStory("story_42")}`);
    expect(displayKeepsakeText(old, "story_42")).toBe(shown);
    expect(KEEPSAKE_CLOSING_LINES).toContain(closingLineForStory("story_42"));
    expect(shown).not.toMatch(/let go|brave|forgive|courageous/);

    const yours = displayKeepsakeText(
      "Today, you kept your cup, woven into the fabric of your life.\n\nI adore this moment. It's luminous. I release. I am bold.",
      "cup-story",
    );
    expect(yours).toBe(
      `Today, I kept my cup, woven into the fabric of my life.\n\n${closingLineForStory("cup-story")}`,
    );
  });

  it("picks any of the ten lines with equal chance and keeps the two new closes", () => {
    expect(KEEPSAKE_CLOSING_LINES[8]).toBe("Something in this moment lights up heaven in me.");
    expect(KEEPSAKE_CLOSING_LINES[9]).toBe("I'm so glad you found me, you beautiful moment.");
    for (let index = 0; index < KEEPSAKE_CLOSING_LINES.length; index += 1) {
      expect(pickClosingLine(() => (index + 0.5) / KEEPSAKE_CLOSING_LINES.length)).toBe(
        KEEPSAKE_CLOSING_LINES[index],
      );
    }
    const heaven = `${STORY}\n\n${KEEPSAKE_CLOSING_LINES[8]}`;
    const glad = `${STORY}\n\n${KEEPSAKE_CLOSING_LINES[9]}`;
    expect(displayKeepsakeText(heaven, "other-story")).toBe(heaven);
    expect(displayKeepsakeText(glad, "other-story")).toBe(glad);
    expect(hasDiminishingPhrase(KEEPSAKE_CLOSING_LINES[8])).toBe(false);
    expect(hasDiminishingPhrase(KEEPSAKE_CLOSING_LINES[9])).toBe(false);
    expect(stripDiminishingPhrases(`A small, sweet theft.\n\n${KEEPSAKE_CLOSING_LINES[9]}`)).toBe(
      `A small, sweet gift.\n\n${KEEPSAKE_CLOSING_LINES[9]}`,
    );
    expect(
      toFirstPersonStory(
        `Today, you kept your cup.\n\n${KEEPSAKE_CLOSING_LINES[9]}`,
      ),
    ).toBe(`Today, I kept my cup.\n\n${KEEPSAKE_CLOSING_LINES[9]}`);
    expect(
      displayKeepsakeText(`Today, you kept your cup.\n\n${KEEPSAKE_CLOSING_LINES[9]}`, "cup"),
    ).toBe(`Today, I kept my cup.\n\n${KEEPSAKE_CLOSING_LINES[9]}`);
  });
});
