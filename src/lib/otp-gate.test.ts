import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function read(rel: string): string {
  return readFileSync(path.resolve(rel), "utf8");
}

describe("email otp gates", () => {
  it("requires a verified otp session before checkout and keeps the pack amount in payfast", () => {
    const checkout = read("src/app/api/payfast/checkout/route.ts");
    const payfast = read("src/lib/payfast.ts");
    expect(checkout).toMatch(/readOtpSession/);
    expect(checkout).toMatch(/otpAllowsEmail/);
    expect(checkout).toMatch(/Verify the code we emailed you before checkout/);
    expect(checkout.indexOf("otpAllowsEmail")).toBeLessThan(checkout.indexOf("createCheckout"));
    expect(payfast).toMatch(/PACK_AMOUNT = "5\.00"/);
    expect(payfast).toMatch(/PACK_MOMENTS = 40/);
  });

  it("does not plant gdn_em from entitlement unless this otp session matches", () => {
    const entitlement = read("src/app/api/payfast/entitlement/route.ts");
    expect(entitlement).toMatch(/readOtpSession/);
    expect(entitlement).toMatch(/otp\?\.email === email/);
    expect(entitlement).not.toMatch(/if \(remaining > 0\) await setGateEmail\(email\)/);
  });

  it("blocks app personal-photo paths and leaves joy picks alone", () => {
    expect(read("src/app/api/captures/route.ts")).toMatch(/requirePersonalPhotoOtp/);
    expect(read("src/app/api/media/[captureId]/route.ts")).toMatch(/requirePersonalPhotoOtp/);
    expect(read("src/app/api/photo-spark/route.ts")).toMatch(/requirePersonalPhotoOtp/);
    expect(read("src/app/api/yours/route.ts")).toMatch(/requirePersonalPhotoOtp/);
    expect(read("src/app/api/joy-match/route.ts")).not.toMatch(/requirePersonalPhotoOtp/);
    expect(read("src/components/JoyStudio.tsx")).not.toMatch(/\/api\/auth\/verify/);
    expect(read("src/app/api/auth/request/route.ts")).toMatch(/sendOtpEmail/);
    expect(read("src/app/api/auth/request/route.ts")).not.toMatch(/code: issued/);
    expect(read("src/app/api/auth/verify/route.ts")).toMatch(/verifyOtp/);
    expect(read("src/app/api/auth/verify/route.ts")).toMatch(/setOtpSession/);
    expect(read("src/lib/entitlement.ts")).toMatch(/putJSON/);
    expect(read("src/lib/entitlement.ts")).not.toMatch(/DynamoDB|dynamoDocument/);
  });
});
