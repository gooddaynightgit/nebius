"use client";

import { useEffect, useRef, useState } from "react";
import {
  SG_BASICS,
  SG_BLOCKS,
  SG_BREATH,
  SG_BREATHE_TOGETHER,
  SG_BUTTON,
  SG_CLOSE,
  SG_HEADLINE,
  SG_QUESTION,
  SG_SUPPORT,
  SG_WELCOME,
  sgThankYou,
} from "@/lib/something-good";

type Step =
  | { kind: "start" }
  | { kind: "say"; text: string; breathe?: number }
  | { kind: "ask" }
  | { kind: "thanks" }
  | { kind: "close" };

const STEPS: Step[] = [
  { kind: "start" },
  { kind: "say", text: SG_WELCOME },
  { kind: "say", text: SG_BREATH, breathe: 1 },
  { kind: "ask" },
  ...SG_BASICS.map((text) => ({ kind: "say" as const, text })),
  { kind: "say", text: `${SG_BREATHE_TOGETHER} ${SG_BREATHE_TOGETHER}`, breathe: 2 },
  { kind: "thanks" },
  { kind: "close" },
];

const BLOCK_TONES = ["card--mint", "card--peach", "card--cyan", "card--cream"] as const;

function speak(lines: string[], on: boolean) {
  if (!on || typeof window === "undefined" || !("speechSynthesis" in window)) return;
  const synth = window.speechSynthesis;
  synth.cancel();
  for (const line of lines) {
    const u = new SpeechSynthesisUtterance(line);
    u.rate = 0.85;
    u.pitch = 1;
    synth.speak(u);
  }
}

export default function SomethingGood() {
  const [index, setIndex] = useState(0);
  const [words, setWords] = useState("");
  const [voice, setVoice] = useState(true);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const step = STEPS[index];
  const thankYou = sgThankYou(words);

  useEffect(() => {
    if (step.kind === "say") speak([step.text], voice);
    if (step.kind === "ask") speak([SG_QUESTION], voice);
    if (step.kind === "thanks") speak([thankYou, "Say it with me.", thankYou], voice);
    if (step.kind === "close") speak([SG_CLOSE], voice);
    if (index > 0) headingRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  useEffect(() => () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
  }, []);

  const next = () => setIndex((i) => Math.min(i + 1, STEPS.length - 1));
  const restart = () => {
    setWords("");
    setIndex(0);
  };
  const toggleVoice = () => {
    if (voice && "speechSynthesis" in window) window.speechSynthesis.cancel();
    setVoice((v) => !v);
  };

  if (step.kind === "start") {
    return (
      <>
        <section className="card card--lavender sg-card sg-hero" aria-labelledby="sg-heading">
          <h1 id="sg-heading">{SG_HEADLINE}</h1>
        </section>
        <ul className="sg-blocks" aria-label="What you can name">
          {SG_BLOCKS.map((label, i) => (
            <li key={label} className={`card sg-block ${BLOCK_TONES[i]}`}>
              <h2>{label}</h2>
            </li>
          ))}
        </ul>
        <section className="card sg-support">
          <h2>{SG_SUPPORT}</h2>
        </section>
        <div className="sg-spacer" aria-hidden="true" />
        <nav className="guide-cta">
          <button type="button" className="step-next step-pin" onClick={next}>
            {SG_BUTTON}
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
          </button>
        </nav>
      </>
    );
  }

  const continueLabel = step.kind === "ask" ? "That's it" : "Continue";

  return (
    <section className="card card--lavender sg-card" aria-live="polite">
      <button type="button" className="sg-voice" onClick={toggleVoice} aria-pressed={voice}>
        {voice ? "Voice on" : "Voice off"}
      </button>

      {step.kind === "say" && step.breathe ? (
        <div className={`sg-breath sg-breath--${step.breathe}`} aria-hidden="true" />
      ) : null}

      {step.kind === "say" && (
        <h2 ref={headingRef} tabIndex={-1} className="sg-line">
          {step.text}
        </h2>
      )}

      {step.kind === "ask" && (
        <>
          <h2 ref={headingRef} tabIndex={-1} className="sg-line">
            {SG_QUESTION}
          </h2>
          <label className="sg-label" htmlFor="sg-words">
            In your own words
          </label>
          <textarea
            id="sg-words"
            className="sg-words"
            rows={3}
            value={words}
            onChange={(e) => setWords(e.target.value)}
            placeholder="My money worries"
          />
        </>
      )}

      {step.kind === "thanks" && (
        <>
          <h2 ref={headingRef} tabIndex={-1} className="sg-line">
            {thankYou}
          </h2>
          <p className="sg-small">Say it with me.</p>
          <p className="sg-line sg-line--echo">{thankYou}</p>
        </>
      )}

      {step.kind === "close" && (
        <h2 ref={headingRef} tabIndex={-1} className="sg-line">
          {SG_CLOSE}
        </h2>
      )}

      {step.kind === "close" ? (
        <button type="button" className="step-next step-soft sg-go" onClick={restart}>
          Start again
        </button>
      ) : (
        <button
          type="button"
          className="step-next sg-go"
          onClick={next}
          disabled={step.kind === "ask" && !words.trim()}
        >
          {continueLabel}
        </button>
      )}
    </section>
  );
}
