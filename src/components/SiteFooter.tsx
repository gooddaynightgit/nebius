"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import BackToStart from "@/components/BackToStart";
import { LANDING } from "@/lib/landing";

export default function SiteFooter({
  site = false,
  className = "",
}: {
  site?: boolean;
  className?: string;
}) {
  const pathname = usePathname();
  return (
    <footer className={className ? `site-footer ${className}` : "site-footer"}>
      {pathname !== "/" ? <BackToStart /> : null}
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
