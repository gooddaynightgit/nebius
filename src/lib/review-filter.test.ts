import { describe, expect, it } from "vitest";
import { isUnkindReview } from "./review-filter";

const BLOCKED = [
  "f*ck",
  "f**k",
  "sh1t",
  "SH1T",
  "f.u.c.k",
  "f u c k",
  "fuuuuck",
  "phuck",
  "f0ck",
  "This is f*cking awful",
  "what the sh1t",
  "you are stupid",
  "such an idiot",
  "kill yourself",
  "kys",
  "you ass",
];

const ALLOWED = [
  "A classic evening, and the light was lovely.",
  "Shiitake mushrooms and a cocktail on the table.",
  "Dickens would have smiled at this quiet.",
  "Hello from Scunthorpe.",
  "The passage home felt soft.",
  "An assumption of kindness.",
  "Spicy and lovely, like the morning.",
  "I am so glad I found this.",
  "A bass note, then the class went still.",
  "The peacock crossed the grass.",
  "I will pass this along.",
  "A glass of water in the sun.",
];

describe("review kindness filter", () => {
  it.each(BLOCKED)("blocks %j", (comment) => {
    expect(isUnkindReview(comment, "")).toBe(true);
  });

  it.each(ALLOWED)("allows %j", (comment) => {
    expect(isUnkindReview(comment, "Amy")).toBe(false);
  });

  it("blocks an obfuscated slur or insult in the name", () => {
    expect(isUnkindReview("The light stayed.", "sh1t")).toBe(true);
    expect(isUnkindReview("The light stayed.", "Amy")).toBe(false);
  });
});
