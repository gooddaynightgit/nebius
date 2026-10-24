"use client";

import { useEffect, useState } from "react";

/**
 * A ball the size of the menu ball, sitting just above it: "Start / OR / Turn" with an arrow.
 * Tap it to glide to the two start buttons (the arrow points down while they're below, up once
 * you've scrolled past). It always stays there; nothing ever scrolls on its own.
 */
export default function ScrollHint({ target }: { target: string }) {
  const [up, setUp] = useState(false);

  useEffect(() => {
    const el = document.getElementById(target);
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([entry]) => setUp(entry.boundingClientRect.top < 0 && !entry.isIntersecting), {
      threshold: 0,
    });
    io.observe(el);
    return () => io.disconnect();
  }, [target]);

  const go = () => {
    const el = document.getElementById(target);
    if (!el) return;
    const still = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ behavior: still ? "auto" : "smooth", block: "center" });
  };

  return (
    <button type="button" className="scroll-hint" onClick={go} aria-label="Go to Start or Flip it">
      <span className="scroll-hint__word">Start</span>
      <span className="scroll-hint__or">OR</span>
      <span className="scroll-hint__word">
        Turn
        <svg className={`scroll-hint__arrow${up ? " is-up" : ""}`} viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 4v15M6 13l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    </button>
  );
}
