import type { Metadata } from "next";
import Link from "next/link";
import SomethingGood from "@/components/SomethingGood";
import { SG_DESCRIPTION, SG_HEADLINE, SG_PATH } from "@/lib/something-good";

const TITLE = `Something Good · ${SG_HEADLINE}`;

export const metadata: Metadata = {
  title: TITLE,
  description: SG_DESCRIPTION,
  alternates: { canonical: `https://gooddaynight.com${SG_PATH}` },
  openGraph: { title: TITLE, description: SG_DESCRIPTION, url: `https://gooddaynight.com${SG_PATH}` },
  twitter: { title: TITLE, description: SG_DESCRIPTION },
};

export default function SomethingGoodPage() {
  return (
    <div className="page guide-page sg-page">
      <header className="site-header">
        <Link className="badge" href="/">
          GoodDayNight
        </Link>
      </header>
      <main id="main">
        <SomethingGood />
      </main>
    </div>
  );
}
