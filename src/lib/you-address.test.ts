import { describe, expect, it } from "vitest";
import { YOU_ADDRESSES, withoutPerfectYou, youAddressFor } from "./you-address";

describe("you addresses", () => {
  it("lists exactly Jasmine's twenty phrases, with no perfect", () => {
    expect([...YOU_ADDRESSES]).toEqual([
      "Remarkable you",
      "Incredible you",
      "Fantastic you",
      "Brilliant you",
      "Marvelous you",
      "Splendid you",
      "Extraordinary you",
      "Phenomenal you",
      "Magnificent you",
      "Wonderful you",
      "Spectacular you",
      "Amazing you",
      "Outstanding you",
      "Exceptional you",
      "Stunning you",
      "Dazzling you",
      "Superb you",
      "Impressive you",
      "Sensational you",
      "Terrific you",
    ]);
    expect(YOU_ADDRESSES).toHaveLength(20);
    for (const phrase of YOU_ADDRESSES) {
      expect(phrase.toLowerCase()).not.toContain("perfect");
    }
  });

  it("rotates by story key and stays put for the same key", () => {
    expect(youAddressFor("photo-a")).toBe(youAddressFor("photo-a"));
    const seen = new Set(
      ["photo-a", "photo-b", "moment-1", "moment-2", "still", "kettle", "sky", "table"].map((key) =>
        youAddressFor(key),
      ),
    );
    expect(seen.size).toBeGreaterThan(1);
    for (const phrase of seen) {
      expect(YOU_ADDRESSES).toContain(phrase);
    }
  });

  it("replaces perfect you with the chosen phrase and leaves no perfect", () => {
    const key = "photo-a";
    const phrase = youAddressFor(key);
    expect(withoutPerfectYou("Perfect, you hunted one good moment today.", key)).toBe(
      `${phrase} hunted one good moment today.`,
    );
    expect(withoutPerfectYou("A perfect you kept the light. It was perfect.", key)).toBe(
      `A ${phrase} kept the light. It was ${phrase.replace(/ you$/i, "")}.`,
    );
    expect(withoutPerfectYou("PERFECT YOU stayed.", key).toLowerCase()).not.toMatch(/\bperfect\b/);
    expect(withoutPerfectYou("Today, you kept the kettle.", key)).toBe("Today, you kept the kettle.");
  });
});
