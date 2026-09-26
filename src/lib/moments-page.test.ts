import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { PRIVACY_NOTE } from "@/lib/privacy";

describe("moments pack page", () => {
  const page = readFileSync(path.resolve("src/app/moments/page.tsx"), "utf8");
  const checkout = readFileSync(path.resolve("src/components/MomentsCheckout.tsx"), "utf8");
  const capture = readFileSync(path.resolve("src/components/CaptureStudio.tsx"), "utf8");
  const privacy = readFileSync(path.resolve("src/lib/privacy.ts"), "utf8");

  it("shows the silk pay box and nothing from the old poster stack", () => {
    expect(page).toContain("My saved joy moments");
    expect(page).toContain("My saved joy moments — GoodDayNight");
    expect(page).toContain("Unlock 40 good moments weaved for");
    expect(page).toContain(">R450<");
    expect(page).toContain("ZAR / $28");
    expect(page).toContain("/weave-silk-1.webp");
    expect(page).toContain("/weave-silk-1.jpg");
    expect(page).toMatch(/moments-glass/);
    expect(page).not.toContain("Your good moments are waiting.");
    expect(page).not.toContain("The good in your own day dies unnoticed");
    expect(page).not.toContain("Anyone can take a photo.");
    expect(page).not.toContain("an archive of your life");
    expect(page).not.toContain("another writing chore");
    expect(page).not.toContain("moods, streaks, or charts");
    expect(page).not.toContain("a performance for anyone else");
    expect(page).not.toContain("Something good is about to happen!");
    expect(page).not.toContain("5.00");
    expect(page).not.toMatch(/R5(?!0)/);
    expect(page).not.toMatch(/\$29/);
    expect(page).not.toMatch(/27\.80/);
    expect(checkout).toMatch(/>\s*Unlock\s*</);
    expect(checkout).not.toContain("Start hunting");
    expect(page).toMatch(/MomentsCheckout/);
    expect(checkout).toMatch(/action="\/api\/payfast\/checkout"/);
    expect(checkout).toMatch(/method="post"/);
    expect(checkout).not.toMatch(/type="email"/);
    expect(checkout).not.toMatch(/<input/);
    expect(checkout).not.toMatch(/Email me a code/);
    expect(checkout).not.toMatch(/Verify code/);
    expect(checkout).not.toMatch(/PRIVACY_NOTE/);
    expect(checkout).not.toMatch(/disabled/);
    expect(page).not.toMatch(/type="email"/);
    expect(page).not.toMatch(/Email me a code/);
    expect(page).not.toMatch(/Verify code/);
    expect(PRIVACY_NOTE).toBe(
      "Your email is only for signing you in and keeping your moments yours.\nWe do not use your photos or words to train AI and not for anyone else’s model or use.\n\nYour moments stay personal — for your security and privacy.",
    );
    const styles = readFileSync(path.resolve("src/app/globals.css"), "utf8");
    expect(styles).toMatch(/\.privacy-note\s*\{[^}]*white-space:\s*pre-line;/);
    expect(privacy).toContain(
      "Email keeps your moments yours. Your photos and words are never used to train AI.",
    );
    const signin = readFileSync(path.resolve("src/components/SignInForm.tsx"), "utf8");
    expect(signin).toMatch(/className="btn moments-code"/);
    expect(signin).toMatch(/Verify code/);
    expect(signin).toMatch(/isSixDigitCode\(code\)/);
    expect(checkout).not.toMatch(/EMAIL_VERIFIED_NOTE/);
    expect(capture).not.toMatch(/Verify code/);
    expect(capture).not.toMatch(/EMAIL_VERIFIED_NOTE/);
    expect(capture).not.toMatch(/buyer-email/);
    expect(capture).not.toMatch(/Open my moments/);
    expect(capture).not.toMatch(/Email me a code/);
    expect(capture).not.toMatch(/PRIVACY_NOTE/);
    expect(styles).toMatch(/\.btn\.moments-code\s*\{[^}]*background:\s*var\(--lime\);/);
    expect(styles).toMatch(/\.btn\.moments-code\s*\{[^}]*color:\s*var\(--navy\);/);
    expect(styles).toMatch(/\.btn\.moments-code:disabled[\s\S]*color:\s*var\(--navy\);/);
    expect(checkout).toMatch(/<button className="moments-cta"/);
    expect(page).not.toMatch(/<Link className="moments-cta"/);
    expect(checkout).not.toMatch(/<Link className="moments-cta"/);
    expect(page).not.toMatch(/stripe/i);
    expect(page).not.toMatch(/one hunt at a time/i);
    expect(page).not.toMatch(/Morning sunlight/);
  });

  it("is not a Start hunting link inside the photo page", () => {
    expect(capture).not.toContain("Start hunting");
    expect(capture).not.toContain("Go get it.");
    expect(capture).not.toContain("Already bought?");
    expect(capture).not.toMatch(/40 good moments — \$29/);
  });

  it("opens Take and Upload only after the paid email has moments left", () => {
    expect(capture).toMatch(/\/api\/payfast\/entitlement/);
    expect(capture).not.toMatch(/\/api\/auth\/verify/);
    expect(capture).not.toMatch(/mode: "buyer"/);
    expect(capture).toMatch(/session\?\.otpVerified/);
    expect(capture).not.toMatch(/setBuyerOpen\(true\)/);
    expect(capture).not.toMatch(/hydrated && buyerOpen/);
    const appPage = readFileSync(path.resolve("src/app/app/page.tsx"), "utf8");
    expect(appPage).toMatch(/dynamic = "force-dynamic"/);
    expect(appPage).toMatch(/isPersonalPhotoSession/);
    expect(appPage).toMatch(/redirect\("\/signin"\)/);
    expect(appPage).not.toMatch(/redirect\("\/moments"\)/);
    expect(appPage).not.toMatch(/signedIn=\{signedIn\}/);
    expect(capture).toMatch(/setCaptureOpen\(true\)/);
    expect(capture).not.toMatch(/const captureOpen = false/);
    expect(capture).toMatch(/destinationForEntitlement/);
    expect(capture).toMatch(/window\.location\.assign\(next\)/);
    expect(capture).not.toMatch(/type="email"/);
    expect(capture).toMatch(/LANDING\.app\.heading/);
    expect(capture).toMatch(/Capture your good moment/);
  });
});