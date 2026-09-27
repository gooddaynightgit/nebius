import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { LANDING } from "./landing";

function read(rel: string): string {
  return readFileSync(path.resolve(rel), "utf8");
}

function walk(dir: string): string[] {
  const files: string[] = [];
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".next" || name === ".git") continue;
    const full = path.join(dir, name);
    const stat = statSync(full);
    if (stat.isDirectory()) files.push(...walk(full));
    else files.push(full);
  }
  return files;
}

describe("about the maker", () => {
  it("keeps Jasmine Hassam’s page copy exact", () => {
    const page = read("src/app/about/page.tsx");
    expect(LANDING.about.title).toBe("About the maker — GoodDayNight");
    expect(page).toContain("LANDING.about.title");
    expect(page).toContain("LANDING.about.body");
    expect(page).toContain("LANDING.about.signature");
    expect(page).toContain('className="badge"');
    expect(page).toContain("GoodDayNight");
    expect(page).toContain('src="/logo.svg"');
    expect(page).toContain('alt="GoodDayNight"');
    expect(page).toContain('className="about-logo"');
    expect(page).toContain('className="card card--lavender"');
    expect(page).not.toContain("<h1");
    expect(page).not.toContain("about-bg__shade");
    expect(page).not.toContain("card__wash");
  });

  it("fills the page with a silent looping background and shows the poster when motion is reduced", () => {
    const page = read("src/app/about/page.tsx");
    const styles = read("src/app/globals.css");
    expect(page).toContain('src="/about-bg.mp4"');
    expect(page).toContain('poster="/about-bg-poster.jpg"');
    expect(page).toContain("autoPlay");
    expect(page).toContain("muted");
    expect(page).toContain("loop");
    expect(page).toContain("playsInline");
    expect(page).toContain('preload="metadata"');
    expect(page).not.toMatch(/\bcontrols\b/);
    expect(styles).toMatch(/\.about-bg__video\s*\{[^}]*position:\s*fixed/);
    expect(styles).toMatch(/\.about-bg__video\s*\{[^}]*object-fit:\s*cover/);
    expect(styles).toMatch(/\.about-page \.card--lavender,\s*\.about-page \.card--lavender::before\s*\{[^}]*background:\s*rgba\(18,\s*40,\s*64,\s*0\.25\)/);
    expect(styles).toMatch(/\.about-page \.site-footer\s*\{[^}]*background:\s*rgba\(18,\s*40,\s*64,\s*0\.25\)/);
    expect(styles).toMatch(/\.about-logo\s*\{[^}]*width:\s*96px/);
    expect(styles).not.toMatch(/\.about-page \.site-footer\s*\{[^}]*rgba\(255,\s*255,\s*255,\s*0\.92\)/);
    const logo = read("public/logo.svg");
    expect(logo).toContain('fill="#D4FF00"');
    expect(logo).toContain('fill="#122840"');
    expect(logo).toContain('rx="204.8"');
    expect(logo).toContain('r="307.2"');
    expect(styles).toMatch(
      /@media \(prefers-reduced-motion:\s*reduce\)\s*\{\s*\.about-bg__video\s*\{\s*display:\s*none;/,
    );
  });

  it("links About the maker from every page footer", () => {
    const footer = read("src/components/SiteFooter.tsx");
    const styles = read("src/app/globals.css");
    expect(footer).toContain("LANDING.footer.lookingForward");
    expect(footer).toContain("LANDING.footer.hello");
    expect(footer).toContain('href="/about"');
    expect(footer).toContain("LANDING.footer.about");
    expect(footer).toContain('className="site-footer__about"');
    expect(footer).toContain("<BackToStart");
    expect(footer).toContain('pathname !== "/"');
    const back = read("src/components/BackToStart.tsx");
    expect(back).toContain('aria-label="Back to start"');
    expect(back).toContain('href="/"');
    expect(back).toContain('className="step-back-arrow"');
    expect(read("src/app/page.tsx")).not.toContain("BackToStart");
    expect(styles).toMatch(/\.site-footer__about[\s\S]*min-height:\s*44px/);
    expect(styles).toMatch(/\.site-footer--moments\s*\{[^}]*z-index:\s*1/);
    expect(styles).toMatch(/body:has\(\.story-opening\) \.step-arrows\s*\{[^}]*z-index:\s*26/);
    expect(footer).toContain("<ForwardStep");
    expect(footer).toContain("stepPageShowsForward");
    expect(read("src/components/step-forward.tsx")).toContain('className="step-forward-arrow"');
    expect(read("src/components/step-forward.tsx")).toContain('"/app/joy"');
    expect(read("src/components/step-forward.tsx")).not.toContain('"/about"');
    expect(read("src/components/step-forward.tsx")).not.toContain('"/signin"');
    expect(read("src/components/JoyStudio.tsx")).toContain("journeyNextLabel(2)");
    expect(read("src/components/MomentsCheckout.tsx")).toContain("journeyNextLabel(3)");
    expect(read("src/components/YoursStory.tsx")).toContain("journeyNextLabel(6)");
    expect(read("src/app/signin/page.tsx")).not.toContain("useRegisterStepForward");
    expect(read("src/app/about/page.tsx")).not.toContain("useRegisterStepForward");
    expect(read("src/app/review/page.tsx")).not.toContain("useRegisterStepForward");
    for (const file of [
      "src/app/page.tsx",
      "src/app/about/page.tsx",
      "src/app/signin/page.tsx",
      "src/app/moments/page.tsx",
      "src/app/review/page.tsx",
      "src/app/review/hide/page.tsx",
      "src/app/admin/reviews/page.tsx",
      "src/components/JoyStudio.tsx",
      "src/components/CaptureStudio.tsx",
      "src/components/YoursStory.tsx",
    ]) {
      expect(read(file), file).toContain("<SiteFooter");
    }
    expect(read("src/components/CaptureStudio.tsx")).toContain("<SiteFooter site />");
    expect(read("src/app/signin/page.tsx")).toContain("<SiteFooter site />");
  });

  it("does not use the previous surname anywhere in the project", () => {
    const roots = ["src", "public", "README.md", "package.json"];
    const files = roots.flatMap((rel) => {
      const full = path.resolve(rel);
      return statSync(full).isDirectory() ? walk(full) : [full];
    });
    const text = /\.(tsx?|jsx?|css|md|json|txt|html|svg|webmanifest)$/i;
    const needle = new RegExp("Moo" + "sa", "i");
    const hits = files.filter((file) => text.test(file) && needle.test(readFileSync(file, "utf8")));
    expect(hits).toEqual([]);
  });
});
