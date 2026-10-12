"use client";

import { useEffect, useRef, useState } from "react";
import HappyBubble from "@/components/HappyBubble";
import { SG_BUTTON, SG_CHOOSE_FIRST, SG_HEADLINE, SG_OPTIONS, SG_SUPPORT, type SgFocus } from "@/lib/something-good";
import { cleanSpeech } from "@/lib/speech-merge";
import { sgFinish, sgStart, type SgPhase, type SgRate, type SgStep } from "@/lib/something-good-mcp";

type Mode = "start" | "loading" | "playing" | "listen" | "confirm" | "done" | "error";

/** Example lines shown in the empty "My perfect result" box. */
const PERFECT_PLACEHOLDER = "I am living in my own home…\nI have the money to…\nI am happy & grateful I have…";

const BLOCK_TONES = ["card--mint", "card--peach", "card--cyan", "card--cream", "card--lavender"] as const;
const RATE: Record<SgRate, number> = { medium: 0.9, slow: 0.75, "x-slow": 0.5 };
/** Quiet this long after speaking means they've finished. */
const SILENCE_MS = 4000;
/** How long to wait for the first words before giving up. */
const FIRST_WORDS_MS = 15000;

// Minimal Web Speech API types (not in every TS DOM lib).
type RecResult = { 0: { transcript: string }; isFinal: boolean };
type RecEvent = { resultIndex: number; results: ArrayLike<RecResult> };
type Recognizer = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: RecEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  start: () => void;
  stop: () => void;
};
type RecognizerCtor = new () => Recognizer;

const hasVoice = () => typeof window !== "undefined" && "speechSynthesis" in window;
function recognizerCtor(): RecognizerCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecognizerCtor; webkitSpeechRecognition?: RecognizerCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export default function SomethingGood() {
  const [mode, setMode] = useState<Mode>("start");
  const [line, setLine] = useState("");
  const [phase, setPhase] = useState<SgPhase | null>(null);
  const [question, setQuestion] = useState("");
  const [words, setWords] = useState("");
  const [choice, setChoice] = useState<SgFocus | null>(null);
  const [chooseError, setChooseError] = useState(false);
  const [stage, setStage] = useState<"opening" | "closing">("opening");
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [listening, setListening] = useState(false);
  const [canListen, setCanListen] = useState(false);
  const [error, setError] = useState("");
  const voiceRef = useRef(true);
  const openingRef = useRef<SgStep[]>([]);
  const closingRef = useRef<SgStep[]>([]);
  const runRef = useRef(0);
  const recRef = useRef<Recognizer | null>(null);
  const wantListenRef = useRef(false);
  const silenceRef = useRef<number | null>(null);
  const baseRef = useRef("");
  const sessionRef = useRef("");
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    setCanListen(Boolean(recognizerCtor()));
    return () => {
      runRef.current += 1;
      if (hasVoice()) window.speechSynthesis.cancel();
      wantListenRef.current = false;
      if (silenceRef.current) window.clearTimeout(silenceRef.current);
      recRef.current?.stop();
    };
  }, []);

  useEffect(() => {
    if (mode !== "start") headingRef.current?.focus();
  }, [mode]);

  const wait = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms));

  const say = (text: string, rate: SgRate, run: number) =>
    new Promise<void>((resolve) => {
      if (runRef.current !== run) return resolve();
      if (!voiceRef.current || !hasVoice()) {
        window.setTimeout(resolve, Math.max(1200, text.length * 55));
        return;
      }
      const u = new SpeechSynthesisUtterance(text.replace(/…/g, "..."));
      u.rate = RATE[rate] ?? 0.75;
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        resolve();
      };
      u.onend = finish;
      u.onerror = finish;
      window.setTimeout(finish, Math.max(2500, (text.length * 110) / u.rate));
      window.speechSynthesis.speak(u);
    });

  /** Play from step `from` onward: each line at its own pace, then its silence. */
  const playFrom = async (which: "opening" | "closing", from: number) => {
    const steps = which === "opening" ? openingRef.current : closingRef.current;
    const run = ++runRef.current;
    if (hasVoice()) window.speechSynthesis.cancel();
    setStage(which);
    setPaused(false);
    setMode("playing");
    for (let i = Math.max(0, from); i < steps.length; i += 1) {
      if (runRef.current !== run) return;
      const step = steps[i];
      setIndex(i);
      setLine(step.text);
      setPhase(step.phase ?? null);
      await say(step.text, step.rate, run);
      if (runRef.current !== run) return;
      await wait(step.pauseMs);
    }
    if (runRef.current !== run) return;
    setPhase(null);
    if (which === "opening") {
      setQuestion(steps[steps.length - 1]?.text ?? "");
      setMode("listen");
    } else {
      setMode("done");
    }
  };

  const fail = (e: unknown) => {
    setError(e instanceof Error ? e.message : "Something went wrong");
    setMode("error");
  };

  const begin = async () => {
    if (!choice) {
      setChooseError(true);
      return;
    }
    // Unlock speech inside the tap itself; some phones block speech that starts after a network wait.
    if (voiceRef.current && hasVoice()) {
      window.speechSynthesis.cancel();
      const unlock = new SpeechSynthesisUtterance(" ");
      unlock.volume = 0;
      window.speechSynthesis.speak(unlock);
    }
    const run = ++runRef.current;
    setWords("");
    setMode("loading");
    try {
      const session = await sgStart(choice);
      if (runRef.current !== run) return;
      openingRef.current = session.steps;
      void playFrom("opening", 0);
    } catch (e) {
      fail(e);
    }
  };

  const finish = async () => {
    stopListening();
    const run = ++runRef.current;
    setMode("loading");
    try {
      const session = await sgFinish(words.trim() || "what you named");
      if (runRef.current !== run) return;
      closingRef.current = session.steps;
      void playFrom("closing", 0);
    } catch (e) {
      fail(e);
    }
  };

  /** Stop listening for good (tap, silence, or moving on). */
  const stopListening = () => {
    wantListenRef.current = false;
    if (silenceRef.current) window.clearTimeout(silenceRef.current);
    recRef.current?.stop();
  };

  /** After someone has spoken, a few seconds of quiet means they've finished. */
  const armSilence = () => {
    if (silenceRef.current) window.clearTimeout(silenceRef.current);
    silenceRef.current = window.setTimeout(stopListening, SILENCE_MS);
  };

  const startRecognizer = () => {
    const Ctor = recognizerCtor();
    if (!Ctor) return;
    const rec = new Ctor();
    rec.lang = navigator.language || "en-US";
    rec.interimResults = true;
    rec.continuous = true;
    const base = baseRef.current;
    rec.onresult = (e) => {
      const parts: string[] = [];
      for (let i = 0; i < e.results.length; i += 1) parts.push(e.results[i][0].transcript);
      const heard = cleanSpeech(parts, base);
      sessionRef.current = heard;
      setWords(heard);
      armSilence();
    };
    rec.onerror = (e) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        wantListenRef.current = false;
        setCanListen(false);
      }
    };
    rec.onend = () => {
      // Phones end recognition on their own after a pause; carry on until silence or a tap.
      baseRef.current = sessionRef.current || baseRef.current;
      if (wantListenRef.current) {
        try {
          startRecognizer();
          return;
        } catch {
          wantListenRef.current = false;
        }
      }
      setListening(false);
    };
    recRef.current = rec;
    rec.start();
  };

  const toggleListen = () => {
    if (listening) {
      stopListening();
      return;
    }
    if (!recognizerCtor()) return;
    if (hasVoice()) window.speechSynthesis.cancel();
    baseRef.current = words.trim();
    sessionRef.current = baseRef.current;
    wantListenRef.current = true;
    setListening(true);
    // Give them time to begin; the silence timer only shortens once they've spoken.
    if (silenceRef.current) window.clearTimeout(silenceRef.current);
    silenceRef.current = window.setTimeout(stopListening, FIRST_WORDS_MS);
    startRecognizer();
  };

  /** Stop her voice only: stay on this line; Prev or Next carries on from here. */
  const stopVoice = () => {
    runRef.current += 1;
    if (hasVoice()) window.speechSynthesis.cancel();
    if (mode === "playing") {
      setPhase(null);
      setPaused(true);
    }
  };

  const goPrev = () => {
    if (mode === "playing") {
      if (index > 0) void playFrom(stage, index - 1);
      else if (stage === "closing") {
        runRef.current += 1;
        if (hasVoice()) window.speechSynthesis.cancel();
        setMode("confirm");
      } else void playFrom("opening", 0);
    } else if (mode === "listen") {
      stopListening();
      void playFrom("opening", openingRef.current.length - 1);
    } else if (mode === "confirm") {
      setMode("listen");
    } else if (mode === "done") {
      void playFrom("closing", closingRef.current.length - 1);
    }
  };

  const goNext = () => {
    if (mode === "playing") {
      const steps = stage === "opening" ? openingRef.current : closingRef.current;
      if (index < steps.length - 1) void playFrom(stage, index + 1);
      else {
        runRef.current += 1;
        if (hasVoice()) window.speechSynthesis.cancel();
        setPhase(null);
        if (stage === "opening") {
          setQuestion(steps[steps.length - 1]?.text ?? "");
          setMode("listen");
        } else setMode("done");
      }
    } else if (mode === "listen") {
      stopListening();
      setMode("confirm");
    } else if (mode === "confirm") {
      void finish();
    }
  };

  const canPrev = mode === "playing" || mode === "listen" || mode === "confirm" || mode === "done";
  const canNext =
    mode === "playing" || (mode === "listen" && Boolean(words.trim())) || (mode === "confirm" && Boolean(words.trim()));

  const restart = () => {
    stopListening();
    runRef.current += 1;
    if (hasVoice()) window.speechSynthesis.cancel();
    setMode("start");
  };

  if (mode === "start") {
    return (
      <>
        <section className="card card--lavender sg-card sg-hero" aria-labelledby="sg-heading">
          <h1 id="sg-heading">{SG_HEADLINE}</h1>
        </section>
        <fieldset className={`sg-blocks${chooseError ? " is-error" : ""}`} aria-describedby="sg-choose">
          <legend className="visually-hidden">What would you like to name?</legend>
          {SG_OPTIONS.map((opt, i) => (
            <label
              key={opt.focus}
              className={`card sg-block ${BLOCK_TONES[i]}${opt.focus === "else" ? " sg-block--wide" : ""}${
                choice === opt.focus ? " is-chosen" : ""
              }`}
            >
              <input
                type="radio"
                name="sg-focus"
                value={opt.focus}
                checked={choice === opt.focus}
                onChange={() => {
                  setChoice(opt.focus);
                  setChooseError(false);
                }}
              />
              <span className="sg-radio" aria-hidden="true" />
              <span className="sg-block__label">{opt.label}</span>
            </label>
          ))}
        </fieldset>
        <p id="sg-choose" className={`sg-choose${chooseError ? " is-shown" : ""}`} role="alert">
          {chooseError ? SG_CHOOSE_FIRST : ""}
        </p>
        <section className="card sg-support">
          <h2>{SG_SUPPORT}</h2>
          <button type="button" className="step-next sg-start" onClick={begin}>
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

  return (
    <section className="card card--lavender sg-card" aria-live="polite">
      <nav className="sg-top" aria-label="Conversation controls">
        <button type="button" className="sg-ctl" onClick={goPrev} disabled={!canPrev} aria-label="Previous">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M19 12H6M11 6l-6 6 6 6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Prev
        </button>
        <button type="button" className="sg-ctl sg-ctl--stop" onClick={stopVoice}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" />
          </svg>
          Stop
        </button>
        <button type="button" className="sg-ctl" onClick={goNext} disabled={!canNext} aria-label="Next">
          Next
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5 12h13M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </nav>

      {mode === "loading" && (
        <h2 ref={headingRef} tabIndex={-1} className="sg-line">
          One moment…
        </h2>
      )}

      {mode === "playing" && (
        <>
          <div className={`sg-breath sg-breath--${phase ?? "rest"}`} aria-hidden="true" />
          <h2 ref={headingRef} tabIndex={-1} className="sg-line">
            {line}
          </h2>
          {paused && <p className="sg-small">Paused. Tap Next to carry on, or Prev to go back.</p>}
        </>
      )}

      {mode === "listen" && (
        <>
          <h2 ref={headingRef} tabIndex={-1} className="sg-line">
            {question}
          </h2>

          <textarea
            id="sg-words"
            aria-label={question || "My perfect result"}
            className="sg-words sg-perfect"
            rows={4}
            value={words}
            onChange={(e) => setWords(e.target.value)}
            placeholder={PERFECT_PLACEHOLDER}
            readOnly={listening}
          />

          {canListen && (
            <div className="sg-listen">
              <button
                type="button"
                className={`sg-mic${listening ? " is-listening" : ""}`}
                onClick={toggleListen}
                aria-pressed={listening}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Zm-7 9a7 7 0 0 0 14 0M12 19v3"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span>{listening ? "Listening… take your time" : words ? "Tap to add more" : "Tap and tell me"}</span>
              </button>
            </div>
          )}

          <button
            type="button"
            className="step-next sg-go"
            onClick={() => {
              stopListening();
              setMode("confirm");
            }}
            disabled={!words.trim()}
          >
            End your conversation
          </button>
          <p className="sg-small">Your words are not saved.</p>
        </>
      )}

      {mode === "confirm" && (
        <>
          <h2 ref={headingRef} tabIndex={-1} className="sg-line">
            Is this what you told me?
          </h2>
          <textarea
            id="sg-confirm"
            aria-label="What you told me"
            className="sg-words sg-heard"
            placeholder={PERFECT_PLACEHOLDER}
            rows={Math.min(7, Math.max(2, Math.ceil(words.length / 26)))}
            value={words}
            onChange={(e) => setWords(e.target.value)}
          />
          <p className="sg-small">Not quite what you said? Tap the words and fix them gently.</p>
          <button type="button" className="step-next sg-go" onClick={finish} disabled={!words.trim()}>
            Shall we continue
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
          <button
            type="button"
            className="sg-link"
            onClick={() => {
              setWords("");
              setMode("listen");
            }}
          >
            Say it again
          </button>
        </>
      )}

      {mode === "done" && (
        <>
          <h2 ref={headingRef} tabIndex={-1} className="sg-line">
            {line}
          </h2>
          <button type="button" className="step-next step-soft sg-go" onClick={restart}>
            Start again
          </button>
        </>
      )}

      {mode === "error" && (
        <>
          <h2 ref={headingRef} tabIndex={-1} className="sg-line">
            Something Good couldn&apos;t connect just now.
          </h2>
          <p className="sg-small">{error}</p>
          <button type="button" className="step-next sg-go" onClick={begin}>
            Try again
          </button>
        </>
      )}
    </section>
  );
}
