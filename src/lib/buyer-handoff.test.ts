import { describe, expect, it } from "vitest";
import { sealOtpCookie } from "./otp-session";
import {
  BUYER_HANDOFF_TTL_SECONDS,
  buyerReturnUrl,
  openBuyerHandoff,
  sealBuyerHandoff,
} from "./buyer-handoff";

const SECRET = "test-secret";

describe("buyer handoff", () => {
  it("restores only a signed, unexpired return for the verified email", () => {
    const now = 1_700_000_000;
    const sealed = sealBuyerHandoff("Amy@Email.com", now, SECRET);
    expect(openBuyerHandoff(sealed, now + 10, SECRET)).toEqual({ email: "amy@email.com" });
    expect(openBuyerHandoff(sealed, now + BUYER_HANDOFF_TTL_SECONDS, SECRET)).toBeNull();
    expect(openBuyerHandoff(sealed, now + 10, "other-secret")).toBeNull();
    expect(openBuyerHandoff(`${sealed}x`, now + 10, SECRET)).toBeNull();
    expect(openBuyerHandoff("amy@email.com", now + 10, SECRET)).toBeNull();
    const otp = sealOtpCookie("amy@email.com", now, SECRET);
    expect(openBuyerHandoff(otp, now + 10, SECRET)).toBeNull();
  });

  it("puts the handoff on the PayFast return and not a bare email", () => {
    const previous = process.env.OTP_SESSION_SECRET;
    process.env.OTP_SESSION_SECRET = SECRET;
    try {
      const url = buyerReturnUrl("https://gooddaynight.com", "pay_abc", "Amy@Email.com", 1_700_000_000);
      expect(url.startsWith("https://gooddaynight.com/api/auth/return?paid=1&ref=pay_abc&handoff=")).toBe(true);
      expect(url).not.toContain("email=");
      const handoff = new URL(url).searchParams.get("handoff") ?? "";
      expect(openBuyerHandoff(handoff, 1_700_000_000 + 10, SECRET)).toEqual({ email: "amy@email.com" });
    } finally {
      if (previous == null) delete process.env.OTP_SESSION_SECRET;
      else process.env.OTP_SESSION_SECRET = previous;
    }
  });
});
