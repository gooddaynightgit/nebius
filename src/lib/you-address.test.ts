import { describe, expect, it } from "vitest";
import { YOU_ADDRESSES, withoutPerfectYou, youAddressFor } from "./you-address";

describe("you addresses", () => {
  it("lists exactly Jasmine's twenty phrases, with no perfect", () => {
    expect([...YOU_ADDRESSES]).toEqual([
      "Remarkable me",
      "Incredible me",
      "Fantastic me",
      "Brilliant me",
      "Marvelous me",
      "Splendid me",
      "Extraordinary me",
      "Phenomenal me",
      "Magnificent me",
      "Wonderful me",
      "Spectacular me",
      "Amazing me",
      "Outstanding me",
      "Exceptional me",
      "Stunning me",
      "Dazzling me",
      "Superb me",
      "Impressive me",
      "Sensational me",
      "Terrific me",
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
      `A ${phrase} kept the light. It was ${phrase.replace(/ (?:you|me)$/i, "")}.`,
    );
    expect(withoutPerfectYou("PERFECT YOU stayed.", key).toLowerCase()).not.toMatch(/\bperfect\b/);
    expect(withoutPerfectYou("Today, you kept the kettle.", key)).toBe("Today, you kept the kettle.");
  });
});
