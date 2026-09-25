import { describe, expect, it, vi } from "vitest";
import {
  DIMINISHING_PHRASES,
  hasDiminishingPhrase,
  settleDiminishingText,
  stripDiminishingPhrases,
} from "./diminish";

describe("diminishing phrase filter", () => {
  it("lists the banned phrases", () => {
    expect([...DIMINISHING_PHRASES]).toEqual([
      "unremarkable",
      "mundane",
      "ordinary",
      "nothing special",
      "insignificant",
      "boring",
    ]);
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

  it("scrubs the first draft when the regenerate fails", async () => {
    const regenerate = vi.fn(async () => {
      throw new Error("offline");
    });
    expect(await settleDiminishingText("perfectly unremarkable", regenerate)).toBe("perfectly mine");
    expect(regenerate).toHaveBeenCalledTimes(1);
  });
});
