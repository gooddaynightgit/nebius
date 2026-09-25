import { describe, expect, it } from "vitest";
import {
  AFFIRMATION_LINE_RE,
  affirmationLine,
  splitWeavedAffirmation,
  stripTrailingAffirmation,
  withAffirmationLine,
} from "./affirmation";

const STORY =
  "Today, I kept the chocolate in the golden morning light. A good moment, woven quietly into the fabric of my life. This is what it means to be alive.";

describe("keepsake affirmation line", () => {
  it("ends the story with a blank line and four sentences in order", () => {
    const out = withAffirmationLine(STORY, () => 0);
    expect(out.startsWith(`${STORY}\n\n`)).toBe(true);
    expect(out.endsWith("\n\nI love this moment. It's beautiful. I forgive. I am courageous.")).toBe(
      true,
    );
    const line = out.slice(out.lastIndexOf("\n\n") + 2);
    expect(line).toMatch(AFFIRMATION_LINE_RE);
    expect(line.split(/(?<=\.)\s+/)).toHaveLength(4);
    const parts = splitWeavedAffirmation(out);
    expect(parts.story).toBe(STORY);
    expect(parts.affirmation).toBe("I love this moment. It's beautiful. I forgive. I am courageous.");
  });

  it("varies the wording and still keeps the four meanings in order", () => {
    let n = 0;
    const random = () => {
      const value = [0.21, 0.21, 0.26, 0.21][n] ?? 0;
      n += 1;
      return value;
    };
    expect(affirmationLine(random)).toBe("I treasure this moment. It's radiant. I let go. I am brave.");
    n = 0;
    const randomLater = () => {
      const value = [0.41, 0.61, 0.01, 0.41][n] ?? 0;
      n += 1;
      return value;
    };
    expect(affirmationLine(randomLater)).toBe(
      "I cherish this moment. It's glorious. I forgive. I am fearless.",
    );
    n = 0;
    const randomBold = () => {
      const value = [0.61, 0.41, 0.51, 0.61][n] ?? 0;
      n += 1;
      return value;
    };
    expect(affirmationLine(randomBold)).toBe(
      "I adore this moment. It's luminous. I release. I am bold.",
    );
  });

  it("strips a trailing duplicate before appending a fresh line", () => {
    const glued = `${STORY} I love this moment. It's beautiful. I forgive. I am courageous.`;
    const separated = `${STORY}\n\nI adore this moment. It's luminous. I release. I am bold.`;
    expect(stripTrailingAffirmation(glued)).toBe(STORY);
    expect(stripTrailingAffirmation(separated)).toBe(STORY);
    const out = withAffirmationLine(separated, () => 0);
    expect(out).toBe(`${STORY}\n\nI love this moment. It's beautiful. I forgive. I am courageous.`);
    expect(out.match(/this moment/gi)).toHaveLength(1);
  });
});
