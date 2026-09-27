/** @vitest-environment happy-dom */

import { readFileSync } from "node:fs";
import path from "node:path";
import { createElement, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import FaqPage, { metadata as faqMeta } from "@/app/faq/page";
import ExamplePage, { metadata as exampleMeta } from "@/app/example/page";
import HowItWorksPage, { metadata as howMeta } from "@/app/how-it-works/page";
import NoBlankPage, { metadata as blankMeta } from "@/app/no-blank-page/page";
import NotAListPage, { metadata as listMeta } from "@/app/not-a-list/page";
import PackPage, { metadata as packMeta } from "@/app/pack/page";
import ReviewsPage, { metadata as reviewsMeta } from "@/app/reviews/page";
import {
  EXAMPLE_CLOSING,
  EXAMPLE_NOTE,
  EXAMPLE_STORY,
  FAQ,
  GUIDE_FORBIDDEN,
  GUIDE_PAGES,
  HOW_IT_WORKS_BODY,
  NO_BLANK_PAGE_BODY,
  NOT_A_LIST_BODY,
  NOT_A_LIST_HEADLINE,
  PACK_BODY,
  PRICE_MARKERS,
  WEAVE_HREF,
  guideReviewLines,
  isGuidePath,
} from "./guide-pages";
import { KEEPSAKE_CLOSING_LINES } from "./affirmation";
import { STEP_LABEL } from "./journey";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) => createElement("a", { href, ...rest }, children),
}));

const pages: Array<{ path: string; headline: string; Page: () => ReactElement; meta: { title?: unknown; description?: unknown } }> = [
  { path: "/how-it-works", headline: "Pick a moment. We write it.", Page: HowItWorksPage, meta: howMeta },
  { path: "/example", headline: "This is what a kept moment reads like.", Page: ExamplePage, meta: exampleMeta },
  { path: "/no-blank-page", headline: "You never start from an empty page.", Page: NoBlankPage, meta: blankMeta },
  { path: "/not-a-list", headline: NOT_A_LIST_HEADLINE, Page: NotAListPage, meta: listMeta },
  { path: "/reviews", headline: "They bought before we asked.", Page: ReviewsPage, meta: reviewsMeta },
  { path: "/pack", headline: "25 moments. $7.99 / R130.", Page: PackPage, meta: packMeta },
  { path: "/faq", headline: FAQ[0].q, Page: FaqPage, meta: faqMeta },
];

function weaveControls(html: string): string[] {
  return [...html.matchAll(/<(a|button)\b([^>]*)>([\s\S]*?)<\/\1>/gi)]
    .filter((match) => match[3].includes("Weave your good moment"))
    .map((match) => match[2]);
}

describe("seven guide pages", () => {
  it("weaves into the same joy step as the landing button", () => {
    const landing = readFileSync(path.resolve("src/app/page.tsx"), "utf8");
    expect(WEAVE_HREF).toBe("/app/joy");
    expect(landing).toContain('href="/app/joy"');
    expect(landing).toContain("STEP_LABEL.start");
    expect(STEP_LABEL.start).toBe("Weave your good moment");
  });

  it("uses the chocolate keep-card story and the product closing line", () => {
    expect(EXAMPLE_STORY).toBe("Today, I kept the chocolate.");
    expect(EXAMPLE_CLOSING).toBe(KEEPSAKE_CLOSING_LINES[1]);
    expect(EXAMPLE_CLOSING).toBe("I treasure this moment. It's radiant \u2013 the wonder and delight of being.");
  });

  it("keeps only the real tester lines that are free of the forbidden words", () => {
    const lines = guideReviewLines();
    expect(lines.map((line) => line.quote)).toEqual([
      '"Anyone can take a photo — GoodDayNight makes you notice what it was."',
      '"The app doesn\'t just save your best moment — it rewires your whole day hunting for it."',
    ]);
    expect(lines.map((line) => line.attribution)).toEqual(["— early user", "— Kim, beta tester"]);
  });

  it.each(pages)("$path renders its headline, one weave link, and no forbidden words", ({ path: route, headline, Page, meta }) => {
    const html = renderToStaticMarkup(createElement(Page));
    expect(html).toContain(headline);
    const controls = weaveControls(html);
    expect(controls).toHaveLength(1);
    expect(controls[0]).toContain(`href="${WEAVE_HREF}"`);
    expect(html).not.toMatch(GUIDE_FORBIDDEN);
    expect(String(meta.title)).toContain(headline);
    expect(String(meta.description).length).toBeGreaterThan(20);
    expect(`${meta.title} ${meta.description}`).not.toMatch(GUIDE_FORBIDDEN);
    const priced = route === "/pack" || route === "/faq";
    for (const marker of PRICE_MARKERS) {
      expect(html.includes(marker)).toBe(priced);
      expect(String(meta.title).includes(marker) || String(meta.description).includes(marker)).toBe(priced);
    }
    expect(isGuidePath(route)).toBe(true);
  });

  it("keeps the owner’s body copy, including guilty, and drops only the R16 sentence on the pack", () => {
    const how = renderToStaticMarkup(createElement(HowItWorksPage));
    expect(how).toContain(HOW_IT_WORKS_BODY);
    const blank = renderToStaticMarkup(createElement(NoBlankPage));
    expect(blank).toContain(NO_BLANK_PAGE_BODY);
    const list = renderToStaticMarkup(createElement(NotAListPage));
    expect(list).toContain(NOT_A_LIST_BODY);
    expect(list).toContain("guilty");
    const pack = renderToStaticMarkup(createElement(PackPage));
    expect(pack).toContain(PACK_BODY);
    expect(pack).not.toContain("No R16 option.");
    const faq = renderToStaticMarkup(createElement(FaqPage));
    for (const item of FAQ) {
      expect(faq).toContain(item.q);
      expect(faq).toContain(item.a);
    }
  });

  it("lists each page in the sitemap", () => {
    const sitemap = readFileSync(path.resolve("public/sitemap.xml"), "utf8");
    for (const page of GUIDE_PAGES) {
      expect(sitemap).toContain(`https://gooddaynight.com${page.path}`);
    }
  });

  it("hides the about link on these paths and leaves it on the rest of the site", () => {
    const menu = readFileSync(path.resolve("src/components/AccountMenu.tsx"), "utf8");
    expect(menu).toMatch(/isGuidePath\(pathname\)/);
    expect(menu).toMatch(/item\.href === "\/about"/);
    expect(isGuidePath("/how-it-works")).toBe(true);
    expect(isGuidePath("/")).toBe(false);
    expect(isGuidePath("/about")).toBe(false);
  });
});
