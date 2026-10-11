"use client";

import { useEffect, useRef, useState } from "react";

const SIZE = 120;
const RISE_MS = 16000;
const REST_MS = 2200;
const BURST_MS = 600;

type Phase = "floating" | "bursting" | "resting";

/** A soap-bubble that drifts up the page, sways, pops (by itself or when tapped), then floats up again. */
export default function HappyBubble({ text }: { text: string }) {
  const ref = useRef<HTMLButtonElement>(null);
  const [phase, setPhase] = useState<Phase>("resting");
  const [reduced, setReduced] = useState(false);
  const run = useRef({ start: 0, x0: 0, sway: 40, popAt: 0.85, seed: 0 });

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(media.matches);
    const timer = window.setTimeout(() => setPhase("floating"), 600);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (reduced) return;
    if (phase === "bursting") {
      const timer = window.setTimeout(() => setPhase("resting"), BURST_MS);
      return () => window.clearTimeout(timer);
    }
    if (phase === "resting") {
      if (ref.current) ref.current.style.opacity = "0";
      const timer = window.setTimeout(() => setPhase("floating"), REST_MS);
      return () => window.clearTimeout(timer);
    }

    const width = window.innerWidth;
    run.current = {
      start: performance.now(),
      x0: Math.random() * Math.max(0, width - SIZE),
      sway: 30 + Math.random() * 50,
      popAt: 0.55 + Math.random() * 0.4,
      seed: Math.random() * Math.PI * 2,
    };

    let frame = 0;
    const tick = (now: number) => {
      const el = ref.current;
      const { start, x0, sway, popAt, seed } = run.current;
      const t = (now - start) / RISE_MS;
      if (t >= popAt) {
        setPhase("bursting");
        return;
      }
      if (el) {
        const height = window.innerHeight;
        const y = height - t * (height + SIZE);
        const maxX = Math.max(0, window.innerWidth - SIZE);
        const x = Math.min(maxX, Math.max(0, x0 + Math.sin(t * 9 + seed) * sway));
        const wobble = 1 + Math.sin(t * 23 + seed) * 0.035;
        el.style.transform = `translate(${x}px, ${y}px) scale(${wobble}, ${2 - wobble})`;
        el.style.opacity = "1";
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [phase, reduced]);

  if (reduced) {
    return <p className="happy-bubble happy-bubble--still">{text}</p>;
  }

  return (
    <button
      ref={ref}
      type="button"
      aria-label={`${text} Tap to pop.`}
      className={`happy-bubble happy-bubble--${phase}`}
      onClick={() => phase === "floating" && setPhase("bursting")}
    >
      <span className="happy-bubble__text">{text}</span>
      {phase === "bursting" ? (
        <span className="happy-bubble__pop" aria-hidden="true">
          {Array.from({ length: 8 }, (_, i) => (
            <i key={i} style={{ ["--a" as string]: `${i * 45}deg` }} />
          ))}
        </span>
      ) : null}
    </button>
  );
}
