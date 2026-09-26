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
    expect(page).toContain('className="card card--lavender"');
    expect(page).not.toContain("<h1");
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
    expect(styles).toMatch(/\.about-page \.card--lavender\s*\{[^}]*background:\s*linear-gradient/);
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
    expect(styles).toMatch(/\.site-footer__about[\s\S]*min-height:\s*44px/);
    for (const file of [
      "src/app/page.tsx",
      "src/app/about/page.tsx",
      "src/app/signin/page.tsx",
      "src/app/moments/page.tsx",
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
