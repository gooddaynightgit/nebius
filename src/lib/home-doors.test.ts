import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { FEEL_GOOD_HREF, GOOD_NEWS_FAQ, GOOD_NEWS_HREF, MAKER_WHY } from "./home-doors";

const read = (file: string) => readFileSync(path.resolve(file), "utf8");

describe("home doors", () => {
  const home = read("src/app/page.tsx");

  it("shows only the circle, the square, and the bubble", () => {
    expect(home).toContain('className="shape-cta shape-cta--circle" href={FEEL_GOOD_HREF}');
    expect(home).toContain('className="shape-cta shape-cta--square" href={GOOD_NEWS_HREF}');
    expect(home).toContain('<HappyBubble text="Something good is happening!" />');
    for (const gone of ["KindWords", "ScrollHint", "landing-demo", "SiteFooter", "hero-heading"]) {
      expect(home, gone).not.toContain(gone);
    }
    expect(FEEL_GOOD_HREF).toBe("/how-to-feel-good");
    expect(GOOD_NEWS_HREF).toBe("/good-news");
  });

  it("keeps the story promise out of the new copy", () => {
    const words = [...GOOD_NEWS_FAQ.map((f) => f.a), ...MAKER_WHY].join(" ");
    expect(words).not.toMatch(/bedtime|story of your good day|tonight/i);
  });

  it("lists both doors in the sitemap and hides the ticker on home", () => {
    const sitemap = read("public/sitemap.xml");
    expect(sitemap).toContain("https://gooddaynight.com/how-to-feel-good");
    expect(sitemap).toContain("https://gooddaynight.com/good-news");
    expect(read("src/components/FeedbackRibbon.tsx")).toContain('pathname === "/"');
  });
});
