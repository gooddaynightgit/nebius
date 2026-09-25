import { describe, expect, it } from "vitest";
import { EMAIL_VERIFIED_NOTE, isSixDigitCode } from "./verify-code";

describe("verify code", () => {
  it("uses the success line with a check mark", () => {
    expect(EMAIL_VERIFIED_NOTE).toBe("Email verified ✓");
  });

  it("accepts only six digits", () => {
    expect(isSixDigitCode("123456")).toBe(true);
    expect(isSixDigitCode("12345")).toBe(false);
    expect(isSixDigitCode("1234567")).toBe(false);
    expect(isSixDigitCode("12 456")).toBe(false);
  });
});
