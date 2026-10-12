"use client";

import { useEffect, useRef, useState } from "react";
import HappyBubble from "@/components/HappyBubble";
import {
  SG_BASICS,
  SG_BLOCKS,
  SG_BREATH_FIRST,
  SG_BREATH_HOLD,
  SG_BREATH_IN,
  SG_BREATH_LET_GO,
  SG_BREATH_MS,
  SG_BREATH_RELEASE,
  SG_BREATH_TWO,
  SG_BUTTON,
  SG_CLOSE,
  SG_HEADLINE,
  SG_QUESTION,
  SG_SUPPORT,
  SG_TAKE_TIME,
  sgThankYou,
} from "@/lib/something-good";

type Step =
  | { kind: "start" }
  | { kind: "say"; text: string }
  | { kind: "breath"; intro: string; reps: number }
  | { kind: "ask" }
  | { kind: "thanks" }
  | { kind: "close" };

type Phase = "intro" | "in" | "hold" | "out" | "done";

const STEPS: Step[] = [
  { kind: "start" },
  { kind: "breath", intro: SG_BREATH_FIRST, reps: 1 },
  { kind: "ask" },
  ...SG_BASICS.map((text) => ({ kind: "say" as const, text })),
  { kind: "breath", intro: SG_BREATH_TWO, reps: 2 },
  { kind: "thanks" },
  { kind: "close" },
];

const BLOCK_TONES = ["card--mint", "card--peach", "card--cyan", "card--cream"] as const;

const NORMAL_RATE = 0.85;
const SLOW_RATE = 0.7;
const VERY_SLOW_RATE = 0.5;

const hasVoice = () => typeof window !== "undefined" && "speechSynthesis" in window;

export default function SomethingGood() {
  const [index, setIndex] = useState(0);
  const [words, setWords] = useState("");
  const [voice, setVoice] = useState(true);
  const [phase, setPhase] = useState<Phase>("intro");
  const [breathLine, setBreathLine] = useState("");
  const headingRef = useRef<HTMLHeadingElement>(null);
  const voiceRef = useRef(voice);
  const runRef = useRef(0);
  const step = STEPS[index];
  const thankYou = sgThankYou(words);

  voiceRef.current = voice;

  /** Speak one line and resolve when it has been said (or would have been, with voice off). */
  const say = (text: string, rate: number, run: number) =>
    new Promise<void>((resolve) => {
      if (runRef.current !== run) return resolve();
      if (!voiceRef.current || !hasVoice()) {
        window.setTimeout(resolve, 900);
        return;
      }
      const u = new SpeechSynthesisUtterance(text);
      u.rate = rate;
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        resolve();
      };
      u.onend = finish;
      u.onerror = finish;
      // Some browsers never fire onend; never let the walk-through stall.
      window.setTimeout(finish, Math.max(2500, (text.length * 110) / rate));
      window.speechSynthesis.speak(u);
    });

  const wait = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

  /** Wait until at least `ms` has passed since `since`. */
  const fill = (since: number, ms: number) => wait(Math.max(0, ms - (performance.now() - since)));

  const speakAll = async (lines: string[], run: number) => {
    for (const line of lines) {
      if (runRef.current !== run) return;
      await say(line, NORMAL_RATE, run);
      await wait(500);
    }
  };

  const breathe = async (intro: string, reps: number, run: number) => {
    const live = () => runRef.current === run;
    setPhase("intro");
    setBreathLine(intro);
    await say(intro, SLOW_RATE, run);
    await wait(1200);
    for (let i = 0; i < reps && live(); i += 1) {
      let since = performance.now();
      setPhase("in");
      setBreathLine(SG_BREATH_IN);
      await say(SG_BREATH_IN, SLOW_RATE, run);
      await fill(since, SG_BREATH_MS.in);
      if (!live()) return;

      since = performance.now();
      setPhase("hold");
      setBreathLine(SG_BREATH_HOLD);
      await say(SG_BREATH_HOLD, SLOW_RATE, run);
      await fill(since, SG_BREATH_MS.hold);
      if (!live()) return;

      since = performance.now();
      setPhase("out");
      setBreathLine(`${SG_BREATH_RELEASE} ${SG_BREATH_LET_GO}`);
      await say(SG_BREATH_RELEASE, VERY_SLOW_RATE, run);
      await wait(1500);
      await say(SG_BREATH_LET_GO, VERY_SLOW_RATE, run);
      await fill(since, SG_BREATH_MS.out);
      if (!live()) return;
      await wait(1000);
    }
    if (live()) setPhase("done");
  };

  useEffect(() => {
    runRef.current += 1;
    const run = runRef.current;
    if (hasVoice()) window.speechSynthesis.cancel();

    if (step.kind === "say") void speakAll([step.text], run);
    if (step.kind === "breath") void breathe(step.intro, step.reps, run);
    if (step.kind === "ask") void speakAll([SG_TAKE_TIME, SG_QUESTION], run);
    if (step.kind === "thanks") void speakAll([thankYou, "Say it with me.", thankYou], run);
    if (step.kind === "close") void speakAll([SG_CLOSE], run);
    if (index > 0) headingRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  useEffect(
    () => () => {
      runRef.current += 1;
      if (hasVoice()) window.speechSynthesis.cancel();
    },
    [],
  );

  const next = () => setIndex((i) => Math.min(i + 1, STEPS.length - 1));
  const restart = () => {
    setWords("");
    setIndex(0);
  };
  const toggleVoice = () => {
    if (voice && hasVoice()) window.speechSynthesis.cancel();
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
          <button type="button" className="step-next sg-start" onClick={next}>
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
        </section>
        <div className="sg-spacer" aria-hidden="true" />
        <HappyBubble text="Something good is about to happen!" />
      </>
    );
  }

  const continueLabel = step.kind === "ask" ? "That's it" : "Continue";
  const breathing = step.kind === "breath" && phase !== "done";

  return (
    <section className="card card--lavender sg-card" aria-live="polite">
      <button type="button" className="sg-voice" onClick={toggleVoice} aria-pressed={voice}>
        {voice ? "Voice on" : "Voice off"}
      </button>

      {step.kind === "breath" && (
        <>
          <div className={`sg-breath sg-breath--${phase}`} aria-hidden="true" />
          <h2 ref={headingRef} tabIndex={-1} className="sg-line">
            {phase === "done" ? SG_TAKE_TIME : breathLine}
          </h2>
        </>
      )}

      {step.kind === "say" && (
        <h2 ref={headingRef} tabIndex={-1} className="sg-line">
          {step.text}
        </h2>
      )}

      {step.kind === "ask" && (
        <>
          <p className="sg-small">{SG_TAKE_TIME}</p>
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
      ) : breathing ? null : (
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
