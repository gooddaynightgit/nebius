import { describe, expect, it } from "vitest";
import { sgSubject, sgThankYou, SG_HEADLINE, SG_BUTTON } from "./something-good";

describe("something good", () => {
  it("keeps the not-grateful-for wording on headline and button", () => {
    expect(SG_HEADLINE).toMatch(/not grateful for/);
    expect(SG_BUTTON).toMatch(/not grateful for/);
  });

  it("speaks their words back, turning my into your", () => {
    expect(sgThankYou("My money worries.")).toBe("Thank you. Something good is about to happen with your money worries.");
    expect(sgSubject("  the job hunt ")).toBe("the job hunt");
    expect(sgSubject("")).toBe("what you named");
  });
});
