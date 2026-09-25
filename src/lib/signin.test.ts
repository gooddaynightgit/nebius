import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { PRIVACY_NOTE } from "./privacy";
import {
  destinationAfterVerifiedLogin,
  followVerifiedLogin,
  SIGN_IN_HREF,
} from "./login-destination";

function read(rel: string): string {
  return readFileSync(path.resolve(rel), "utf8");
}

describe("post-login destination", () => {
  it("opens capture only when game is above zero", () => {
    expect(destinationAfterVerifiedLogin(1)).toBe("/app");
    expect(destinationAfterVerifiedLogin(40)).toBe("/app");
    expect(destinationAfterVerifiedLogin(0)).toBe("/moments");
    expect(destinationAfterVerifiedLogin(-1)).toBe("/moments");
    expect(destinationAfterVerifiedLogin(null)).toBe("/moments");
    expect(destinationAfterVerifiedLogin(Number.NaN)).toBe("/moments");
  });

  it("follows the server path and treats anything else as payment", () => {
    expect(followVerifiedLogin("/app")).toBe("/app");
    expect(followVerifiedLogin("/moments")).toBe("/moments");
    expect(followVerifiedLogin("checkout")).toBe("/moments");
    expect(followVerifiedLogin(undefined)).toBe("/moments");
    expect(followVerifiedLogin("/signin")).toBe("/moments");
    expect(SIGN_IN_HREF).toBe("/signin");
  });
});

describe("email-only sign-in screen", () => {
  const page = read("src/app/signin/page.tsx");
  const form = read("src/components/SignInForm.tsx");
  const moments = read("src/app/moments/page.tsx");
  const verify = read("src/app/api/auth/verify/route.ts");

  it("shows the email form and the privacy note, with no price", () => {
    expect(page).toMatch(/SignInForm/);
    expect(page).toMatch(/destinationForVerifiedEmail/);
    expect(page).not.toMatch(/R450|\$28|Start hunting|moments-cta/);
    expect(form).toContain("Email me a code");
    expect(form).toContain("Verify code");
    expect(form).toMatch(/isSixDigitCode\(code\)/);
    expect(form).toMatch(/followVerifiedLogin/);
    expect(form).toMatch(/PRIVACY_NOTE/);
    expect(form).not.toMatch(/R450|\$28|Start hunting|moments-cta|40 good moments/);
    expect(PRIVACY_NOTE).toBe(
      "Your email is only for signing you in and keeping your moments yours.\nWe do not use your photos or words to train AI and not for anyone else’s model or use.\n\nYour moments stay personal — for your security and privacy.",
    );
  });

  it("sends a visitor with no session to sign-in, and keeps payment for a verified email", () => {
    expect(moments).toMatch(/isPersonalPhotoSession/);
    expect(moments).toMatch(/redirect\("\/signin"\)/);
    expect(moments).toMatch(/R450/);
    expect(moments).toMatch(/ZAR \/ \$28/);
    expect(moments).toMatch(/MomentsCheckout/);
    const checkout = read("src/components/MomentsCheckout.tsx");
    expect(checkout).not.toMatch(/type="email"/);
    expect(checkout).not.toMatch(/<input/);
    expect(checkout).not.toMatch(/Email me a code|Verify code|PRIVACY_NOTE|EMAIL_VERIFIED_NOTE/);
    expect(moments).not.toMatch(/type="email"/);
    expect(moments).toContain("Every good moment weaved adds to the rich tapestry of life");
    expect(moments).not.toContain("Your good moments are waiting.");
    expect(verify).toMatch(/destinationForVerifiedEmail/);
    expect(verify).not.toMatch(/mode === "checkout"/);
    expect(verify.indexOf("setOtpSession")).toBeLessThan(verify.indexOf("destinationForVerifiedEmail"));
  });
});
