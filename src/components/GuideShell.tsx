import Link from "next/link";
import type { ReactNode } from "react";
import { STEP_LABEL } from "@/lib/journey";
import { WEAVE_HREF } from "@/lib/guide-pages";

/** One in-flow weave button. No step pill, no footer. */
export default function GuideShell({ children }: { children: ReactNode }) {
  return (
    <div className="page guide-page">
      <header className="site-header">
        <Link className="badge" href="/">
          GoodDayNight
        </Link>
      </header>
      <main id="main">
        {children}
        <nav className="guide-cta">
          <Link className="step-next" href={WEAVE_HREF}>
            {STEP_LABEL.start}
            <svg className="step-next__arrow" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M5 12h13M13 6l6 6-6 6"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>
        </nav>
      </main>
    </div>
  );
}
