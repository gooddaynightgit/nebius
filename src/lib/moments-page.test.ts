import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("moments pack page", () => {
  const page = readFileSync(path.resolve("src/app/moments/page.tsx"), "utf8");
  const capture = readFileSync(path.resolve("src/components/CaptureStudio.tsx"), "utf8");

  it("states the wound, the nots, the offer, and a path into the app", () => {
    expect(page).toContain("The good in your own day dies unnoticed — every single night.");
    expect(page).toContain("Anyone can take a photo.");
    expect(page).toContain("GoodDayNight makes you notice what it was.");
    expect(page).toContain("an archive of your life");
    expect(page).toContain("another writing chore");
    expect(page).toContain("moods, streaks, or charts");
    expect(page).toContain("a performance for anyone else");
    expect(page).toContain("one good moment a day — noticed, here until midnight, then gone.");
    expect(page).toContain("Share only if you want a card to keep. The habit of seeing stays.");
    expect(page).toContain("40 good moments —");
    expect(page).toContain("R450 ZAR · $28 USD");
    expect(page).toContain("Each moment: one photo upload → one My good moment story.");
    expect(page).not.toMatch(/Upload uses a moment/);
    expect(page).not.toMatch(/Replay and Share/);
    expect(page).toContain("Start hunting — R450 ZAR / $28 USD");
    expect(page).not.toMatch(/R450(?! ZAR)/);
    expect(page).toContain("40 moments. Yours to find — the finding changes you.");
    expect(page).not.toMatch(/\$29/);
    expect(page).not.toMatch(/27\.80/);
    expect(page).toContain("Something good is about to happen!");
    expect(page).toContain("Gooddaynight.com");
    expect(page).toMatch(/href="\/app"/);
    expect(page).not.toMatch(/stripe/i);
    expect(page).not.toMatch(/one hunt at a time/i);
    expect(page).not.toMatch(/Morning sunlight/);
  });

  it("is linked from the photo page without living inside the capture form", () => {
    expect(capture).toMatch(/href="\/moments"/);
    expect(capture).toContain("Start hunting");
    expect(capture).not.toMatch(/40 good moments — \$29/);
  });
});