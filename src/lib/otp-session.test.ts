import { describe, expect, it } from "vitest";
import {
  OTP_COOKIE,
  OTP_SESSION_TTL_SECONDS,
  openOtpCookie,
  otpAllowsEmail,
  sealOtpCookie,
} from "./otp-session";

const SECRET = "test-secret";

describe("otp session cookie", () => {
  it("seals a normalized email and rejects tampering or expiry", () => {
    const now = 1_700_000_000;
    const sealed = sealOtpCookie("Amy@Email.com", now, SECRET, OTP_SESSION_TTL_SECONDS);
    expect(OTP_COOKIE).toBe("gdn_otp");
    expect(openOtpCookie(sealed, now + 10, SECRET)).toEqual({ email: "amy@email.com" });
    expect(openOtpCookie(sealed, now + OTP_SESSION_TTL_SECONDS, SECRET)).toBeNull();
    expect(openOtpCookie(`${sealed}x`, now + 10, SECRET)).toBeNull();
    expect(openOtpCookie(sealed, now + 10, "other-secret")).toBeNull();
    const dot = sealed.lastIndexOf(".");
    const payload = sealed.slice(0, dot);
    const sig = sealed.slice(dot + 1);
    const flipped = `${sig.slice(0, -1)}${sig.endsWith("a") ? "b" : "a"}`;
    expect(openOtpCookie(`${payload}.${flipped}`, now + 10, SECRET)).toBeNull();
  });

  it("allows checkout only for the verified email", () => {
    expect(otpAllowsEmail({ email: "amy@email.com" }, "Amy@Email.com")).toBe(true);
    expect(otpAllowsEmail({ email: "amy@email.com" }, "other@email.com")).toBe(false);
    expect(otpAllowsEmail(null, "amy@email.com")).toBe(false);
    expect(otpAllowsEmail({ email: "amy@email.com" }, "not-an-email")).toBe(false);
  });
});
