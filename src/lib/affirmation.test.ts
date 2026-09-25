import { describe, expect, it } from "vitest";
import {
  KEEPSAKE_CLOSING_LINE,
  displayKeepsakeText,
  splitKeepsakeClosing,
  stripTrailingClosing,
  withClosingLine,
} from "./affirmation";

const STORY =
  "Today, I kept the chocolate in the golden morning light. A good moment, woven quietly into the fabric of my life. This is what it means to be alive.";

describe("keepsake closing line", () => {
  it("ends every story with one blank line and the same close", () => {
    const out = withClosingLine(STORY);
    expect(out).toBe(`${STORY}\n\n${KEEPSAKE_CLOSING_LINE}`);
    expect(KEEPSAKE_CLOSING_LINE).toBe(
      "I love this moment. It's beautiful \u2013 the joy and awe of being.",
    );
    expect(out.endsWith(`\n\n${KEEPSAKE_CLOSING_LINE}`)).toBe(true);
    const parts = splitKeepsakeClosing(out);
    expect(parts.story).toBe(STORY);
    expect(parts.closing).toBe(KEEPSAKE_CLOSING_LINE);
    expect(withClosingLine(out)).toBe(out);
  });

  it("strips a model-written copy before appending the fixed line", () => {
    const copied = `${STORY}\n\nI love this moment. It\u2019s beautiful - the joy and awe of being.`;
    expect(stripTrailingClosing(copied)).toBe(STORY);
    expect(withClosingLine(copied)).toBe(`${STORY}\n\n${KEEPSAKE_CLOSING_LINE}`);
  });

  it("shows the new line when a saved story still ends on the old four sentences", () => {
    const saved = `${STORY}\n\nI treasure this moment. It's radiant. I let go. I am brave.`;
    const shown = displayKeepsakeText(saved);
    expect(shown).toBe(`${STORY}\n\n${KEEPSAKE_CLOSING_LINE}`);
    expect(shown).not.toMatch(/let go|brave|forgive|courageous/);
    const yours = displayKeepsakeText(
      "Today, you kept your cup, woven into the fabric of your life.\n\nI adore this moment. It's luminous. I release. I am bold.",
    );
    expect(yours).toBe(
      `Today, I kept my cup, woven into the fabric of my life.\n\n${KEEPSAKE_CLOSING_LINE}`,
    );
  });
});
