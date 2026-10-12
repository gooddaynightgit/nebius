import Link from "next/link";
import type { ReactNode } from "react";
import { SG_PATH } from "@/lib/something-good";

/** Shell for the Something Good info pages: badge, content, one way back to the ritual. */
export default function SgShell({ children }: { children: ReactNode }) {
  return (
    <div className="page guide-page sg-page">
      <header className="site-header">
        <Link className="badge" href="/">
          GoodDayNight
        </Link>
      </header>
      <main id="main">
        {children}
        <section className="card sg-support">
          <h2>Support to lead you to something good.</h2>
          <Link className="step-next sg-start" href={SG_PATH}>
            Start
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
        </section>
        <div className="sg-spacer" aria-hidden="true" />
      </main>
    </div>
  );
}
