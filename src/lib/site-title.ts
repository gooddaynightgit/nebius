import type { Metadata } from "next";

/** Document, Open Graph, and Twitter title for GoodDayNight pages. */
export const SITE_TITLE = "GoodDayNight — Weave one good moment from today";

export const siteTitleMetadata: Metadata = {
  title: SITE_TITLE,
  openGraph: { title: SITE_TITLE },
  twitter: { title: SITE_TITLE },
};
