import { describe, expect, it } from "vitest";
import { sgSubject, sgThankYou, SG_HEADLINE, SG_BUTTON } from "./something-good";

describe("something good", () => {
  it("keeps the not-grateful-for wording on the headline, Start on the button", () => {
    expect(SG_HEADLINE).toMatch(/not grateful for/);
    expect(SG_BUTTON).toBe("Start");
  });

  it("speaks their words back, turning my into your", () => {
    expect(sgThankYou("My money worries.")).toBe("Thank you. Something good is about to happen with your money worries.");
    expect(sgSubject("  the job hunt ")).toBe("the job hunt");
    expect(sgSubject("")).toBe("what you named");
  });
});
