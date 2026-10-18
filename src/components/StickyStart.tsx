"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { STEP_LABEL } from "@/lib/journey";

/** The start buttons and the footer; the bar steps aside while any of them is on screen. */
const WATCH = ["#home-ctas", "#home-close", "footer"];

const Arrow = () => (
  <svg className="home-sticky__arrow" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M5 12h13M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/**
 * Both ways in, pinned above the review strip, so the next step is always one tap away.
 * Nothing moves on its own: it simply stays put while they scroll, and steps aside when the
 * real buttons are in view.
 */
export default function StickyStart() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const targets = WATCH.map((sel) => document.querySelector(sel)).filter((el): el is Element => Boolean(el));
    if (!targets.length || typeof IntersectionObserver === "undefined") return;
    const visible = new Set<Element>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) visible.add(e.target);
          else visible.delete(e.target);
        }
        setShow(visible.size === 0);
      },
      { threshold: 0.25 },
    );
    targets.forEach((t) => io.observe(t));
    return () => io.disconnect();
  }, []);

  return (
    <nav className={`home-sticky${show ? " is-shown" : ""}`} aria-label="Get started" aria-hidden={!show} inert={!show}>
      <Link className="home-sticky__btn home-sticky__btn--start" href="/app/joy" tabIndex={show ? 0 : -1}>
        <span>{STEP_LABEL.start}</span>
        <Arrow />
      </Link>
      <Link className="home-sticky__btn home-sticky__btn--turn" href="/something-good" tabIndex={show ? 0 : -1}>
        <span>Turn it around</span>
        <Arrow />
      </Link>
    </nav>
  );
}
