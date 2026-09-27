"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import BackToStart from "@/components/BackToStart";
import { ForwardStep, stepPageShowsForward, useStepForward } from "@/components/step-forward";
import { LANDING } from "@/lib/landing";

export default function SiteFooter({
  site = false,
  className = "",
}: {
  site?: boolean;
  className?: string;
}) {
  const pathname = usePathname();
  const forward = useStepForward();
  const showForward = Boolean(forward && stepPageShowsForward(pathname));
  return (
    <footer className={className ? `site-footer ${className}` : "site-footer"}>
      {pathname !== "/" ? (
        <div className="step-arrows">
          <BackToStart />
          {showForward && forward ? <ForwardStep action={forward} /> : null}
        </div>
      ) : null}
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
