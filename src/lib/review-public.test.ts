import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { KIND_WORDS_HEADING, KIND_WORDS_LIMIT, REVIEW_FRIEND } from "./review-copy";
import { firstNameOnly, newestReviews, toPublicReview } from "./review-public";

describe("public review display", () => {
  it("uses the first name, or a friend when the name is missing or an email", () => {
    expect(firstNameOnly("Amy Hassan")).toBe("Amy");
    expect(firstNameOnly("  Noor  ")).toBe("Noor");
    expect(firstNameOnly("")).toBe(REVIEW_FRIEND);
    expect(firstNameOnly("amy@email.com")).toBe(REVIEW_FRIEND);
  });

  it("publishes only a shown 4 or 5 star review and never carries an email", () => {
    const shown = toPublicReview({
      id: "review_abc",
      stars: 5,
      comment: "The quiet stayed.",
      name: "Amy Hassan",
      createdAt: "2026-09-26T00:00:00.000Z",
      published: true,
    });
    expect(shown).toEqual({
      id: "review_abc",
      stars: 5,
      comment: "The quiet stayed.",
      name: "Amy",
      createdAt: "2026-09-26T00:00:00.000Z",
    });
    expect(shown && "email" in shown).toBe(false);
    expect(toPublicReview({ id: "review_mid", stars: 3, comment: "Alright.", name: "Sam", createdAt: "2026-09-26T00:00:00.000Z", published: true })).toBeNull();
    expect(toPublicReview({ id: "review_hide", stars: 5, comment: "Lovely.", name: "Amy", createdAt: "2026-09-26T00:00:00.000Z", published: false })).toBeNull();
  });

  it("keeps the newest reviews, six on the landing", () => {
    const reviews = Array.from({ length: 8 }, (_, index) => ({
      id: `review_${index}`,
      createdAt: `2026-09-${String(index + 1).padStart(2, "0")}T00:00:00.000Z`,
    }));
    const newest = newestReviews(reviews, KIND_WORDS_LIMIT);
    expect(newest).toHaveLength(6);
    expect(newest[0]?.id).toBe("review_7");
    expect(newest.at(-1)?.id).toBe("review_2");
  });

  it("places Kind words under the landing demo and above the review form", () => {
    const landing = readFileSync(path.resolve("src/app/page.tsx"), "utf8");
    const review = readFileSync(path.resolve("src/app/review/page.tsx"), "utf8");
    expect(landing.indexOf('className="landing-demo"')).toBeLessThan(landing.indexOf("<KindWords"));
    expect(landing.indexOf("<KindWords")).toBeLessThan(landing.indexOf("closing-heading"));
    expect(landing).toMatch(/limit=\{KIND_WORDS_LIMIT\}/);
    expect(landing).toMatch(/showLink/);
    expect(review.indexOf("<KindWords")).toBeLessThan(review.indexOf("<ReviewForm"));
    expect(KIND_WORDS_HEADING).toBe("Kind words");
    expect(REVIEW_FRIEND).toBe("A GoodDayNight friend");
  });
});
