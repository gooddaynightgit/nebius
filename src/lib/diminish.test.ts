import { describe, expect, it, vi } from "vitest";
import { KEEPSAKE_CLOSING_LINES } from "./affirmation";
import {
  DIMINISHING_PHRASES,
  hasDiminishingPhrase,
  settleDiminishingText,
  stripDiminishingPhrases,
} from "./diminish";

describe("diminishing phrase filter", () => {
  it("lists the banned phrases and leaves dark, grey, and alone off the hard filter", () => {
    expect(DIMINISHING_PHRASES).toEqual(
      expect.arrayContaining([
        "unremarkable",
        "mundane",
        "ordinary",
        "nothing special",
        "insignificant",
        "boring",
        "theft",
        "stolen",
        "imperfect",
        "sadness",
        "failure",
      ]),
    );
    expect(DIMINISHING_PHRASES).not.toEqual(expect.arrayContaining(["dark", "grey", "alone"]));
    expect(hasDiminishingPhrase("mine alone under a grey sky, full of darkness and stars")).toBe(
      false,
    );
    expect(hasDiminishingPhrase("Remarkable me kept an Extraordinary hour")).toBe(false);
    expect(hasDiminishingPhrase("a flawless sincere morning")).toBe(false);
  });

  it("turns perfectly unremarkable into perfectly mine", () => {
    expect(stripDiminishingPhrases("the moment tender and bright, perfectly unremarkable")).toBe(
      "the moment tender and bright, perfectly mine",
    );
    expect(stripDiminishingPhrases("Perfectly unremarkable light")).toBe("Perfectly mine light");
  });

  it("replaces each banned phrase and keeps praise words", () => {
    expect(stripDiminishingPhrases("An ordinary, mundane, boring cup")).toBe(
      "A dear, dear, dear cup",
    );
    expect(stripDiminishingPhrases("nothing special, and insignificant")).toBe(
      "worth keeping, and precious",
    );
    expect(stripDiminishingPhrases("UNREMARKABLE")).toBe("PRECIOUS");
    expect(hasDiminishingPhrase("Remarkable me kept an Extraordinary hour")).toBe(false);
    expect(stripDiminishingPhrases("Remarkable me kept an Extraordinary hour")).toBe(
      "Remarkable me kept an Extraordinary hour",
    );
  });

  it("regenerates once, then scrubs whatever is still banned", async () => {
    const regenerate = vi.fn(async () => "Still perfectly unremarkable, still mine.");
    const kept = await settleDiminishingText("a mundane morning", regenerate);
    expect(regenerate).toHaveBeenCalledTimes(1);
    expect(kept).toBe("Still perfectly mine, still mine.");
    expect(hasDiminishingPhrase(kept)).toBe(false);
  });

  it("keeps a clean regenerate and skips the call when the draft is already clear", async () => {
    const regenerate = vi.fn(async () => "Today, I kept the light, precious and bright.");
    const kept = await settleDiminishingText("an insignificant pause", regenerate);
    expect(kept).toBe("Today, I kept the light, precious and bright.");
    const clean = vi.fn(async () => "should not run");
    expect(await settleDiminishingText("Today, I kept the radiant light.", clean)).toBe(
      "Today, I kept the radiant light.",
    );
    expect(clean).not.toHaveBeenCalled();
  });

  it("turns a sweet theft into a sweet gift, including inflections", () => {
    expect(
      stripDiminishingPhrases("A small, sweet theft woven into the story of my mornings."),
    ).toBe("A small, sweet gift woven into the story of my mornings.");
    expect(hasDiminishingPhrase("A small, sweet theft woven into the story of my mornings.")).toBe(
      true,
    );
    expect(stripDiminishingPhrases("a stolen moment")).toBe("a gifted moment");
    expect(stripDiminishingPhrases("an imperfect cup")).toBe("a cup just as it is");
    expect(stripDiminishingPhrases("She was stealing a quiet hour")).toBe(
      "She was savouring a quiet hour",
    );
    for (const word of [
      "stealing",
      "stole",
      "stolen",
      "sneaky",
      "guilty",
      "sinful",
      "imperfect",
      "flaws",
      "sadness",
      "wasted",
      "regrets",
      "hurting",
      "afraid",
      "worries",
      "lacking",
      "missing",
      "failures",
      "thefts",
      "thieves",
    ]) {
      expect(hasDiminishingPhrase(`I kept the ${word} light`)).toBe(true);
      expect(hasDiminishingPhrase(stripDiminishingPhrases(`I kept the ${word} light`))).toBe(false);
    }
  });

  it("leaves a saved closing line untouched while it rewrites the story", () => {
    const close = KEEPSAKE_CLOSING_LINES[1];
    const cleaned = stripDiminishingPhrases(
      `A small, sweet theft woven into the story of my mornings.\n\n${close}`,
    );
    expect(cleaned).toBe(
      `A small, sweet gift woven into the story of my mornings.\n\n${close}`,
    );
    expect(hasDiminishingPhrase(close)).toBe(false);
  });

  it("regenerates once when a theft remains, then replaces it", async () => {
    const regenerate = vi.fn(async () => "A small, sweet theft woven into the story of my mornings.");
    const kept = await settleDiminishingText(
      "A small, sweet theft woven into the story of my mornings.",
      regenerate,
    );
    expect(regenerate).toHaveBeenCalledTimes(1);
    expect(kept).toBe("A small, sweet gift woven into the story of my mornings.");
    expect(hasDiminishingPhrase(kept)).toBe(false);
  });

  it("scrubs the first draft when the regenerate fails", async () => {
    const regenerate = vi.fn(async () => {
      throw new Error("offline");
    });
    expect(await settleDiminishingText("perfectly unremarkable", regenerate)).toBe("perfectly mine");
    expect(regenerate).toHaveBeenCalledTimes(1);
  });
});
