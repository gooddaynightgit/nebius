import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/otp", () => ({
  VERIFY_FAIL: "That code didn’t work. Request a new one.",
  otpTable: () => ({}),
  verifyOtp: vi.fn(),
}));

vi.mock("@/lib/session", () => ({
  setOtpSession: vi.fn(),
}));

vi.mock("@/lib/entitlement", () => ({
  getEntitlement: vi.fn(),
}));

import { POST } from "@/app/api/auth/verify/route";
import { getEntitlement } from "@/lib/entitlement";
import { verifyOtp } from "@/lib/otp";
import { setOtpSession } from "@/lib/session";
import { destinationForVerifiedEmail } from "@/lib/verified-destination";

const entitlement = {
  emailVaultId: "em_test",
  remaining: 0,
  paymentIds: [] as string[],
  updatedAt: "2026-09-25T00:00:00.000Z",
};

function post(body: unknown) {
  return POST(
    new Request("http://localhost/api/auth/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

beforeEach(() => {
  vi.mocked(verifyOtp).mockReset();
  vi.mocked(setOtpSession).mockReset();
  vi.mocked(getEntitlement).mockReset();
  vi.mocked(verifyOtp).mockResolvedValue(true);
  vi.mocked(setOtpSession).mockResolvedValue(true);
});

describe("verified login lookup", () => {
  it("opens capture when game is above zero", async () => {
    vi.mocked(getEntitlement).mockResolvedValue({ ...entitlement, remaining: 12 });
    await expect(destinationForVerifiedEmail("amy@email.com")).resolves.toBe("/app");
  });

  it("opens payment when game is zero or the user is missing", async () => {
    vi.mocked(getEntitlement).mockResolvedValue({ ...entitlement, remaining: 0 });
    await expect(destinationForVerifiedEmail("amy@email.com")).resolves.toBe("/moments");
    vi.mocked(getEntitlement).mockResolvedValue(null);
    await expect(destinationForVerifiedEmail("amy@email.com")).resolves.toBe("/moments");
  });

  it("opens payment when the lookup throws", async () => {
    vi.mocked(getEntitlement).mockRejectedValue(new Error("dynamo"));
    await expect(destinationForVerifiedEmail("amy@email.com")).resolves.toBe("/moments");
  });
});

describe("OTP verify route", () => {
  it("sets the session and sends game above zero to /app", async () => {
    vi.mocked(getEntitlement).mockResolvedValue({ ...entitlement, remaining: 40, paymentIds: ["pf"] });
    const res = await post({ email: "Amy@Email.com", code: "123456", mode: "checkout" });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, next: "/app" });
    expect(setOtpSession).toHaveBeenCalledWith("amy@email.com");
    expect(getEntitlement).toHaveBeenCalledWith("amy@email.com");
  });

  it("sends game zero or a missing user to payment", async () => {
    vi.mocked(getEntitlement).mockResolvedValue({ ...entitlement, remaining: 0 });
    const zero = await post({ email: "amy@email.com", code: "123456" });
    expect(await zero.json()).toEqual({ ok: true, next: "/moments" });

    vi.mocked(getEntitlement).mockResolvedValue(null);
    const missing = await post({ email: "new@email.com", code: "654321" });
    expect(await missing.json()).toEqual({ ok: true, next: "/moments" });
  });

  it("still sets the session and falls back to payment when lookup fails", async () => {
    vi.mocked(getEntitlement).mockRejectedValue(new Error("dynamo"));
    const res = await post({ email: "amy@email.com", code: "123456" });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, next: "/moments" });
    expect(setOtpSession).toHaveBeenCalledWith("amy@email.com");
  });

  it("does not look up a balance when the code is refused", async () => {
    vi.mocked(verifyOtp).mockResolvedValue(false);
    const res = await post({ email: "amy@email.com", code: "000000" });
    expect(res.status).toBe(400);
    expect(getEntitlement).not.toHaveBeenCalled();
    expect(setOtpSession).not.toHaveBeenCalled();
  });
});
