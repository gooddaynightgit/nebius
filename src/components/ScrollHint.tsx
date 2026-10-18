"use client";

import { useEffect, useState } from "react";

/**
 * A gently bobbing arrow that points down to the two start buttons.
 * Tap it to glide there; scrolling by hand arrives there too. Once the buttons
 * have been in view, it fades away for good. Nothing ever scrolls on its own.
 */
export default function ScrollHint({ target }: { target: string }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const el = document.getElementById(target);
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShow(false);
          io.disconnect(); // seen once: stay gone
        } else if (entry.boundingClientRect.top > 0) {
          setShow(true); // still below the screen
        }
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [target]);

  const go = () => {
    const el = document.getElementById(target);
    if (!el) return;
    const still = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ behavior: still ? "auto" : "smooth", block: "center" });
    setShow(false);
  };

  return (
    <button
      type="button"
      className={`scroll-hint${show ? " is-shown" : ""}`}
      onClick={go}
      aria-label="Go to the start buttons"
      aria-hidden={!show}
      tabIndex={show ? 0 : -1}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 5v13M6 12l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
