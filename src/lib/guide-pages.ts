import type { Metadata } from "next";
import { KEEPSAKE_CLOSING_LINES } from "./affirmation";
import { FEEDBACK_LINES } from "./feedback";

/** Same destination as the landing “Weave your good moment” button. */
export const WEAVE_HREF = "/app/joy";

export const GUIDE_FORBIDDEN = /sleep|bedtime|voice|r16|about the maker/i;

export const PRICE_MARKERS = ["$7.99", "R130"] as const;

/**
 * Chocolate line from the keep-card fixture in src/lib/keep-card.test.ts.
 * Closing line is the product’s second keepsake close, the same line that fixture pairs with it.
 * No moment photo for this story exists in the repo.
 */
export const EXAMPLE_STORY = "Today, I kept the chocolate.";
export const EXAMPLE_CLOSING = KEEPSAKE_CLOSING_LINES[1];
export const EXAMPLE_NOTE = "This is not a gratitude list. It is one thing that happened.";

export function guideReviewLines() {
  return FEEDBACK_LINES.filter((line) => !GUIDE_FORBIDDEN.test(`${line.quote}\n${line.attribution}`));
}

export const GUIDE_PAGES = [
  {
    path: "/how-it-works",
    headline: "Pick a moment. We write it.",
    description:
      "3 steps only. You choose the kind of good moment, capture it, and keep a short written weave. No blank page. No 52-week program.",
    price: false,
  },
  {
    path: "/example",
    headline: "This is what a kept moment reads like.",
    description: "One kept moment, written down. This is not a gratitude list. It is one thing that happened.",
    price: false,
  },
  {
    path: "/no-blank-page",
    headline: "You never start from an empty page.",
    description:
      "People quit journals because they don’t know what to write. Here you pick a good moment first. The writing comes after the pick. That is the whole product.",
    price: false,
  },
  {
    path: "/not-a-list",
    headline: "Not “I’m grateful for my family.”",
    description:
      "Forced lists feel fake and then people feel guilty. GoodDayNight keeps one specific thing: the coffee, the wave, the walk home. One moment. Not three generic lines.",
    price: false,
  },
  {
    path: "/reviews",
    headline: "They bought before we asked.",
    description: "Anyone can take a photo — GoodDayNight makes you notice what it was.",
    price: false,
  },
  {
    path: "/pack",
    headline: "25 moments. $7.99 / R130.",
    description:
      "One pack. 25 woven moments. You see how it reads first. You pay when you capture, if you have not already. No subscription on this pack.",
    price: true,
  },
  {
    path: "/faq",
    headline: "The day vanished into my phone.",
    description: "You don’t start with a blank page. You pick. We write it with you. 25 woven moments. $7.99 / R130.",
    price: true,
  },
] as const;

export type GuidePath = (typeof GUIDE_PAGES)[number]["path"];

export function isGuidePath(pathname: string | null): boolean {
  if (!pathname) return false;
  const path = pathname.length > 1 && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
  return GUIDE_PAGES.some((page) => page.path === path);
}

export function guideMetadata(path: GuidePath): Metadata {
  const page = GUIDE_PAGES.find((item) => item.path === path);
  if (!page) throw new Error(`Unknown guide page ${path}`);
  const title = `${page.headline} — GoodDayNight`;
  return {
    title,
    description: page.description,
    openGraph: {
      title,
      description: page.description,
      url: `https://gooddaynight.com${page.path}`,
    },
    twitter: {
      title,
      description: page.description,
    },
  };
}

export const HOW_IT_WORKS_BODY = `3 steps only.
1. You choose the kind of good moment (a hello, something done slowly, a little movement).
2. You capture it.
3. You get a short written weave you can keep.
No blank page. No 52-week program.`;

export const NO_BLANK_PAGE_BODY =
  "People quit journals because they don’t know what to write. Here you pick a good moment first. The writing comes after the pick. That is the whole product.";

export const NOT_A_LIST_HEADLINE = "Not “I’m grateful for my family.”";
export const NOT_A_LIST_BODY =
  "Forced lists feel fake and then people feel guilty. GoodDayNight keeps one specific thing: the coffee, the wave, the walk home. One moment. Not three generic lines.";

export const PACK_BODY =
  "One pack. 25 woven moments. You see how it reads first. You pay when you capture, if you have not already. No subscription on this pack.";

export const FAQ = [
  {
    q: "The day vanished into my phone.",
    a: "Yes. You keep one moment that was actually yours.",
  },
  {
    q: "I never know what to write.",
    a: "You don’t start with a blank page. You pick. We write it with you.",
  },
  {
    q: "Gratitude lists feel fake.",
    a: "This is not three generic items. It is one thing that happened.",
  },
  {
    q: "I quit journals in a week.",
    a: "This is not a 52-week program. One moment. Then another if you want.",
  },
  {
    q: "What do I get and when do I pay?",
    a: "25 woven moments. $7.99 / R130. You pay at Capture if you have not bought.",
  },
] as const;
