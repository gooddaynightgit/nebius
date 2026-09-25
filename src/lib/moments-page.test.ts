import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { PRIVACY_NOTE } from "@/lib/privacy";

describe("moments pack page", () => {
  const page = readFileSync(path.resolve("src/app/moments/page.tsx"), "utf8");
  const checkout = readFileSync(path.resolve("src/components/MomentsCheckout.tsx"), "utf8");
  const capture = readFileSync(path.resolve("src/components/CaptureStudio.tsx"), "utf8");
  const privacy = readFileSync(path.resolve("src/lib/privacy.ts"), "utf8");

  it("states the wound, the nots, the offer, and a path into the app", () => {
    expect(page).toContain("The good in your own day dies unnoticed — every single night.");
    expect(page).toContain("Anyone can take a photo.");
    expect(page).toContain("GoodDayNight makes you notice what it was.");
    expect(page).toContain("an archive of your life");
    expect(page).toContain("another writing chore");
    expect(page).toContain("moods, streaks, or charts");
    expect(page).toContain("a performance for anyone else");
    expect(page).toContain("several good moments — noticed, and kept so you can look back.");
    expect(page).toContain("Share only if you want a card to keep. The habit of seeing stays.");
    expect(page).toContain("40 good moments —");
    expect(page).toContain("R450 ZAR · $28 USD");
    expect(page).not.toContain("5.00");
    expect(page).not.toMatch(/R5(?!0)/);
    expect(page).toContain("Each moment: one photo upload → Create your story.");
    expect(page).not.toMatch(/Upload uses a moment/);
    expect(page).not.toMatch(/Replay and Share/);
    expect(checkout).toContain("Start hunting — R450 ZAR / $28 USD");
    expect(page).not.toMatch(/R450(?! ZAR)/);
    expect(page).toContain("40 moments. Yours to find — the finding changes you.");
    expect(page).not.toMatch(/\$29/);
    expect(page).not.toMatch(/27\.80/);
    expect(page).toContain("Something good is about to happen!");
    expect(page).toContain("gooddaynight.com");
    expect(page).toMatch(/MomentsCheckout/);
    expect(checkout).toMatch(/action="\/api\/payfast\/checkout"/);
    expect(checkout).toMatch(/method="post"/);
    expect(checkout).toMatch(/name="email"/);
    expect(checkout).toMatch(/\/api\/auth\/request/);
    expect(checkout).toMatch(/\/api\/auth\/verify/);
    expect(checkout).toMatch(/mode: "checkout"/);
    expect(checkout).toMatch(/PRIVACY_NOTE/);
    expect(PRIVACY_NOTE).toBe(
      "Your email is only for signing you in and keeping your moments yours.\nWe do not use your photos or words to train AI and not for anyone else’s model or use.\n\nYour moments stay personal — for your security and privacy.",
    );
    const styles = readFileSync(path.resolve("src/app/globals.css"), "utf8");
    expect(styles).toMatch(/\.privacy-note\s*\{[^}]*white-space:\s*pre-line;/);
    expect(privacy).toContain(
      "Email keeps your moments yours. Your photos and words are never used to train AI.",
    );
    expect(checkout).toMatch(/<button className="moments-cta"/);
    expect(page).not.toMatch(/<Link className="moments-cta"/);
    expect(checkout).not.toMatch(/<Link className="moments-cta"/);
    expect(page).toMatch(/href="\/app"/);
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
    expect(capture).toMatch(/\/api\/auth\/verify/);
    expect(capture).toMatch(/mode: "buyer"/);
    expect(capture).toMatch(/session\?\.otpVerified/);
    expect(capture).toMatch(/PRIVACY_NOTE/);
    expect(capture).toMatch(/const showBuyerEmail = !signedIn && !emailDismissed/);
    expect(capture).not.toMatch(/setBuyerOpen\(true\)/);
    expect(capture).not.toMatch(/hydrated && buyerOpen/);
    const appPage = readFileSync(path.resolve("src/app/app/page.tsx"), "utf8");
    expect(appPage).toMatch(/dynamic = "force-dynamic"/);
    expect(appPage).toMatch(/isPersonalPhotoSession/);
    expect(appPage).toMatch(/signedIn=\{signedIn\}/);
    expect(capture).toMatch(/setCaptureOpen\(true\)/);
    expect(capture).not.toMatch(/const captureOpen = false/);
    expect(capture).toContain("You’re in. Take or upload today’s moment.");
    expect(capture).toContain("Noted. Capture stays closed until this purchase is confirmed.");
    expect(capture).toMatch(/destinationForEntitlement/);
    expect(capture).toMatch(/window\.location\.assign\(next\)/);
    expect(capture).not.toMatch(/type="email"/);
  });
});