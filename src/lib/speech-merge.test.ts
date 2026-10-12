import { describe, expect, it } from "vitest";
import { cleanSpeech, collapseRepeats, mergeSpeech } from "./speech-merge";

describe("speech merge", () => {
  it("takes cumulative Android results without doubling", () => {
    expect(cleanSpeech(["I'd love", "I'd love to be in", "I'd love to be in my own fully paid up home"])).toBe(
      "I'd love to be in my own fully paid up home",
    );
  });

  it("drops a repeat of the whole thing", () => {
    expect(
      cleanSpeech(["I'd love to be in my own fully paid up", "I'd love to be in my own fully paid up"]),
    ).toBe("I'd love to be in my own fully paid up");
  });

  it("joins on overlap when someone restarts their thought", () => {
    expect(mergeSpeech("I'd love to be in my own", "my own fully paid up home")).toBe(
      "I'd love to be in my own fully paid up home",
    );
  });

  it("appends genuinely new words", () => {
    expect(mergeSpeech("my money worries", "and my health")).toBe("my money worries and my health");
  });

  it("collapses a phrase said twice in a row", () => {
    expect(collapseRepeats("I'd love to be I'd love to be in my own home")).toBe("I'd love to be in my own home");
  });
});
