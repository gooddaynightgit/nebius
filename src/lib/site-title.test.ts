import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { metadata as momentsMeta } from "@/app/moments/page";
import { metadata as paidMeta } from "@/app/paid/page";
import { GUIDE_PAGES, guideMetadata } from "./guide-pages";
import { SITE_TITLE } from "./site-title";

function read(rel: string) {
  return readFileSync(path.resolve(rel), "utf8");
}

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return /\.(tsx?|jsx?|json|webmanifest)$/.test(name) ? [full] : [];
  });
}

describe("site title", () => {
  it("is the exact weave-one-good-moment title, with an em dash", () => {
    expect(SITE_TITLE).toBe("GoodDayNight — Weave one good moment from today");
    expect(SITE_TITLE).toContain("\u2014");
    expect(SITE_TITLE).not.toMatch(/Hear your story|sleep|bedtime|voice/i);
  });

  it("sets the layout title, og:title, and twitter:title", () => {
    const layout = read("src/app/layout.tsx");
    expect(layout.match(/title: SITE_TITLE/g)).toHaveLength(3);
    expect(layout).not.toContain("Hear your story");
  });

  it("uses that title on every guide page", () => {
    for (const page of GUIDE_PAGES) {
      const meta = guideMetadata(page.path);
      expect(meta.title).toBe(SITE_TITLE);
      expect(meta.openGraph && "title" in meta.openGraph ? meta.openGraph.title : null).toBe(SITE_TITLE);
      expect(meta.twitter && "title" in meta.twitter ? meta.twitter.title : null).toBe(SITE_TITLE);
      expect(meta.description).toBe(page.description);
    }
  });

  it("uses that title on moments and paid", () => {
    expect(momentsMeta.title).toBe(SITE_TITLE);
    expect(momentsMeta.openGraph && "title" in momentsMeta.openGraph ? momentsMeta.openGraph.title : null).toBe(SITE_TITLE);
    expect(momentsMeta.twitter && "title" in momentsMeta.twitter ? momentsMeta.twitter.title : null).toBe(SITE_TITLE);
    expect(paidMeta.title).toBe(SITE_TITLE);
    expect(paidMeta.openGraph && "title" in paidMeta.openGraph ? paidMeta.openGraph.title : null).toBe(SITE_TITLE);
    expect(paidMeta.twitter && "title" in paidMeta.twitter ? paidMeta.twitter.title : null).toBe(SITE_TITLE);
    expect(read("src/app/moments/page.tsx")).toContain("My new joy moments");
  });

  it("leaves the home and weave pages on the layout title", () => {
    for (const file of ["src/app/page.tsx", "src/app/app/page.tsx", "src/app/app/joy/page.tsx", "src/app/app/yours/page.tsx"]) {
      const src = read(file);
      expect(src).not.toMatch(/export const metadata/);
      expect(src).not.toContain("document.title");
    }
    expect(read("src/app/page.tsx")).toContain("You scrolled past a hundred good moments today.");
    const titled = sourceFiles(path.resolve("src")).filter((file) => /document\.title\s*=/.test(readFileSync(file, "utf8")));
    expect(titled).toEqual([]);
  });

  it("keeps Hear your story only on the visible free call to action", () => {
    const hits = sourceFiles(path.resolve("src"))
      .filter((file) => !file.endsWith(`${path.sep}site-title.test.ts`))
      .filter((file) => readFileSync(file, "utf8").includes("Hear your story"))
      .map((file) => path.relative(path.resolve("."), file));
    expect(hits.sort()).toEqual([
      "src/components/MomentAccordion.tsx",
      "src/lib/landing.test.ts",
      "src/lib/landing.ts",
      "src/lib/product.test.ts",
    ]);
    expect(read("src/lib/landing.ts")).toContain('cta: "Hear your story — free"');
    const manifest = JSON.parse(read("public/site.webmanifest")) as {
      name: string;
      short_name: string;
      description: string;
    };
    expect(manifest.name).toBe("GoodDayNight");
    expect(manifest.short_name).toBe("GoodDayNight");
    expect(`${manifest.name} ${manifest.short_name} ${manifest.description}`).not.toContain("Hear your story");
    expect(read("src/app/layout.tsx")).not.toContain("Hear your story");
  });
});
