"use client";

import Link from "next/link";
import { LANDING } from "@/lib/landing";

export default function SiteFooter({
  site = false,
  className = "",
}: {
  site?: boolean;
  className?: string;
}) {
  return (
    <footer className={className ? `site-footer ${className}` : "site-footer"}>
      <p>
        {LANDING.footer.lookingForward}
        <br />
        <a href={`mailto:${LANDING.footer.hello}`}>{LANDING.footer.hello}</a>
      </p>
      <p>
        <Link className="site-footer__about" href="/about">
          {LANDING.footer.about}
        </Link>
      </p>
      {site ? (
        <p>
          <Link href="/">{LANDING.footer.site}</Link>
        </p>
      ) : null}
    </footer>
  );
}
