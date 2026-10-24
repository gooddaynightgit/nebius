import { describe, expect, it } from "vitest";
import { sgSubject, sgThankYou, SG_HEADLINE, SG_BUTTON } from "./something-good";

describe("something good", () => {
  it("keeps the not-grateful-for wording on the headline, Start on the button", () => {
    expect(SG_HEADLINE).toBe("Name what you're not feeling good about");
    expect(SG_BUTTON).toBe("Start");
  });

  it("speaks their words back, turning my into your", () => {
    expect(sgThankYou("My money worries.")).toBe("Thank you. Something good is happening with your money worries.");
    expect(sgSubject("  the job hunt ")).toBe("the job hunt");
    expect(sgSubject("")).toBe("what you named");
  });
});
