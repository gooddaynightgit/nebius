import type { Metadata } from "next";

export const SITE_URL = "https://gooddaynight.com";

/** Document, Open Graph, and Twitter title for GoodDayNight pages. */
export const SITE_TITLE = "GoodDayNight — Find the good feeling in your day, or flip your day";

/** "<Page> — GoodDayNight" */
export function pageTitle(name: string): string {
  return `${name} — GoodDayNight`;
}

export const siteTitleMetadata: Metadata = {
  title: SITE_TITLE,
  openGraph: { title: SITE_TITLE },
  twitter: { title: SITE_TITLE },
};

/** Signed-in and one-off screens: keep out of search results, still crawlable (no robots.txt Disallow). */
export const NOINDEX: Metadata["robots"] = { index: false, follow: true };

/** Per-page title, description, canonical, Open Graph, and Twitter. */
export function pageMetadata({
  name,
  description,
  path,
  index = true,
}: {
  name: string;
  description: string;
  path: string;
  index?: boolean;
}): Metadata {
  const title = pageTitle(name);
  const url = `${SITE_URL}${path}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { type: "website", title, description, url, siteName: "GoodDayNight", locale: "en_US" },
    twitter: { card: "summary_large_image", title, description },
    ...(index ? {} : { robots: NOINDEX }),
  };
}
