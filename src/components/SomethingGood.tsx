"use client";

import { useEffect, useRef, useState } from "react";
import HappyBubble from "@/components/HappyBubble";
import SignInForm from "@/components/SignInForm";
import { SG_BUTTON, SG_CHOOSE_FIRST, SG_HEADLINE, SG_OPTIONS, SG_SUPPORT, type SgFocus } from "@/lib/something-good";
import { collapseRepeats, mergeSpeech } from "@/lib/speech-merge";
import {
  sgCheck,
  sgCountry,
  sgSpell,
  sgFinish,
  sgStart,
  type SgCheck,
  type SgPhase,
  type SgRate,
  type SgStep,
} from "@/lib/something-good-mcp";

type Mode = "start" | "loading" | "playing" | "signin" | "listen" | "done" | "error";

/** Example lines shown in the empty "My perfect result" box. */
const PERFECT_PLACEHOLDER = "I am living in my own home…\nI have the money to…\nI am happy & grateful I have…";

/** Stop recording after this much quiet. */
const SILENCE_MS = 7000;

const BLOCK_TONES = ["card--mint", "card--peach", "card--cyan", "card--cream", "card--lavender"] as const;
const RATE: Record<SgRate, number> = { medium: 0.9, slow: 0.75, "x-slow": 0.5 };

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
  const [speaking, setSpeaking] = useState(false);
  const [listening, setListening] = useState(false);
  const [canListen, setCanListen] = useState(false);
  const [error, setError] = useState("");
  const [check, setCheck] = useState<(SgCheck & { text: string }) | null>(null);
  const [spell, setSpell] = useState<{ text: string; corrected: string } | null>(null);
  const keptRef = useRef<Set<string>>(new Set());
  /** One play is spent per ritual, after the welcome and before the breath. */
  const spentRef = useRef(false);
  const countryRef = useRef<string | undefined>(undefined);
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
    countryRef.current = sgCountry();
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

  // Check the perfect result against the shared rules once they pause typing or speaking.
  useEffect(() => {
    if (mode !== "listen" || listening) return;
    const text = words.trim();
    if (!text) {
      setCheck(null);
      return;
    }
    let live = true;
    const t = window.setTimeout(() => {
      sgCheck(text, countryRef.current)
        .then((r) => live && setCheck({ ...r, text }))
        .catch(() => live && setCheck({ status: "ok", ok: true, message: "", maxChars: 300, text }));
    }, 500);
    return () => {
      live = false;
      window.clearTimeout(t);
    };
  }, [words, mode, listening]);

  // Offer a spelling fix once they pause; nothing changes unless they say yes.
  useEffect(() => {
    if (mode !== "listen" || listening) return;
    const text = words.trim();
    if (text.length < 8 || keptRef.current.has(text)) {
      setSpell(null);
      return;
    }
    let live = true;
    const t = window.setTimeout(() => {
      sgSpell(text)
        .then((r) => {
          if (!live) return;
          const corrected = r?.corrected?.trim();
          setSpell(r?.changed && corrected && corrected !== text ? { text, corrected } : null);
        })
        .catch(() => live && setSpell(null));
    }, 1200);
    return () => {
      live = false;
      window.clearTimeout(t);
    };
  }, [words, mode, listening]);

  const spelling = spell && spell.text === words.trim() ? spell : null;

  const checked = check && check.text === words.trim() ? check : null;
  const canFinish = Boolean(words.trim()) && !listening && Boolean(checked?.ok);

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

  /**
   * After the welcome: signed in with plays left -> spend one and carry on.
   * Not signed in -> email code sign-in. No plays left -> the purchase page.
   */
  const gate = async (): Promise<boolean> => {
    if (spentRef.current) return true;
    try {
      const res = await fetch("/api/something-good/spend", { method: "POST", credentials: "same-origin" });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; signIn?: boolean; buy?: boolean; href?: string; error?: string };
      if (data.ok) {
        spentRef.current = true;
        return true;
      }
      if (data.signIn) {
        runRef.current += 1;
        setSpeaking(false);
        setPhase(null);
        setMode("signin");
        return false;
      }
      if (data.buy) {
        window.location.assign(data.href ?? "/moments");
        return false;
      }
      throw new Error(data.error ?? "We couldn't check your plays right now.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "We couldn't check your plays right now.");
      setMode("error");
      return false;
    }
  };

  /** Back from sign-in: spend the play and carry on with the breath. */
  const afterSignIn = async () => {
    setMode("loading");
    if (await gate()) void playFrom("opening", 1);
  };

  /** Play from step `from` onward: each line at its own pace, then its silence. */
  const playFrom = async (which: "opening" | "closing", from: number) => {
    const steps = which === "opening" ? openingRef.current : closingRef.current;
    const run = ++runRef.current;
    if (hasVoice()) window.speechSynthesis.cancel();
    setStage(which);
    setPaused(false);
    setSpeaking(true);
    for (let i = Math.max(0, from); i < steps.length; i += 1) {
      if (runRef.current !== run) return;
      const step = steps[i];
      const last = which === "opening" && i === steps.length - 1;
      setMode(last ? "listen" : "playing");
      setIndex(i);
      setLine(step.text);
      setPhase(step.phase ?? null);
      if (step.speak?.length) {
        for (let p = 0; p < step.speak.length; p += 1) {
          if (runRef.current !== run) return;
          await say(step.speak[p], step.rate, run);
          if (p < step.speak.length - 1) await wait(step.speakPauseMs ?? 1500);
        }
      } else {
        await say(step.text, step.rate, run);
      }
      if (runRef.current !== run) return;
      await wait(step.pauseMs);
      if (which === "opening" && i === 0 && !spentRef.current) {
        if (!(await gate())) return;
        if (runRef.current !== run) return;
      }
    }
    if (runRef.current !== run) return;
    setSpeaking(false);
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
      const session = await sgFinish(words.trim() || "what you named", countryRef.current);
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

  /** Each word heard restarts the 7-second quiet timer. */
  const armSilence = () => {
    if (silenceRef.current) window.clearTimeout(silenceRef.current);
    silenceRef.current = window.setTimeout(stopListening, SILENCE_MS);
  };

  const startRecognizer = () => {
    const Ctor = recognizerCtor();
    if (!Ctor) return;
    const rec = new Ctor();
    rec.lang = navigator.language || "en-US";
    // One sentence per turn, final words only: the most reliable mode on phones.
    // When the phone ends the turn at a pause, we start the next turn and add to what's kept.
    rec.interimResults = false;
    rec.continuous = false;
    rec.onresult = (e) => {
      let heard = "";
      for (let i = 0; i < e.results.length; i += 1) {
        if (e.results[i].isFinal) heard = mergeSpeech(heard, e.results[i][0].transcript);
      }
      if (!heard.trim()) return;
      const kept = collapseRepeats(mergeSpeech(sessionRef.current, heard));
      sessionRef.current = kept;
      setWords(kept);
      armSilence();
    };
    rec.onerror = (e) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        wantListenRef.current = false;
        setCanListen(false);
      }
    };
    rec.onend = () => {
      if (wantListenRef.current) {
        try {
          startRecognizer();
          return;
        } catch {
          wantListenRef.current = false;
        }
      }
      if (silenceRef.current) window.clearTimeout(silenceRef.current);
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
    cancelSpeech();
    baseRef.current = words.trim();
    sessionRef.current = baseRef.current;
    wantListenRef.current = true;
    setListening(true);
    // Pauses are fine; 7 seconds of quiet (or Stop recording) ends it.
    armSilence();
    startRecognizer();
  };

  /** Stop her voice only: stay on this line; Prev or Next carries on from here. */
  const stopVoice = () => {
    runRef.current += 1;
    setSpeaking(false);
    if (hasVoice()) window.speechSynthesis.cancel();
    if (mode === "playing") {
      setPhase(null);
      setPaused(true);
    }
  };

  const cancelSpeech = () => {
    runRef.current += 1;
    setSpeaking(false);
    if (hasVoice()) window.speechSynthesis.cancel();
  };

  const goPrev = () => {
    stopListening();
    if (mode === "playing" || (mode === "listen" && stage === "opening")) {
      if (index > 0) void playFrom(stage, index - 1);
      else if (stage === "closing") {
        cancelSpeech();
        setMode("listen");
      } else void playFrom("opening", 0);
    } else if (mode === "done") {
      void playFrom("closing", closingRef.current.length - 1);
    }
  };

  const goNext = () => {
    const steps = stage === "opening" ? openingRef.current : closingRef.current;
    if (speaking || mode === "playing") {
      if (stage === "opening" && index === 0 && !spentRef.current) {
        cancelSpeech();
        void (async () => {
          if (await gate()) void playFrom("opening", 1);
        })();
        return;
      }
      if (index < steps.length - 1) {
        void playFrom(stage, index + 1);
        return;
      }
      cancelSpeech();
      setPhase(null);
      if (stage === "opening") {
        setMode("listen");
        return;
      }
      setMode("done");
      return;
    }
    if (mode === "listen" && canFinish) void finish();
  };

  const canPrev = mode === "playing" || mode === "listen" || mode === "done";
  const canNext =
    mode === "playing" || speaking || (mode === "listen" && canFinish);

  const restart = () => {
    spentRef.current = false;
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

  const lastScreen = mode === "done" || (mode === "playing" && stage === "closing");

  return (
    <>
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

      {mode === "signin" && (
        <>
          <h2 ref={headingRef} tabIndex={-1} className="sg-line">
            Sign in to carry on
          </h2>
          <p className="sg-help">Enter your email and we&apos;ll send you a 6-digit code. No password needed.</p>
          <div className="sg-signin">
            <SignInForm onVerified={() => void afterSignIn()} />
          </div>
        </>
      )}

      {mode === "listen" && (
        <>
          <h2 ref={headingRef} tabIndex={-1} className="sg-line">
            {openingRef.current[openingRef.current.length - 1]?.text ?? question}
          </h2>

          <p className="sg-help">Please type in your perfect result below, or tap the mic to say it.</p>

          <textarea
            id="sg-words"
            aria-label={question || "Your perfect result"}
            className="sg-words sg-perfect"
            rows={4}
            value={words}
            onChange={(e) => setWords(e.target.value)}
            placeholder={PERFECT_PLACEHOLDER}
            readOnly={listening}
          />
          <p className="sg-help sg-help--small">
            Feel free to edit the text above.
            {words.trim().length > 240 && (
              <span className={`sg-count${words.trim().length > 300 ? " is-over" : ""}`}> {words.trim().length} / 300</span>
            )}
          </p>

          {spelling && checked?.status !== "crisis" && (
            <div className="sg-spell" role="status">
              <p className="sg-spell__label">Did you mean:</p>
              <p className="sg-spell__text">{spelling.corrected}</p>
              <div className="sg-spell__actions">
                <button
                  type="button"
                  className="sg-rec__btn"
                  onClick={() => {
                    setWords(spelling.corrected);
                    setSpell(null);
                  }}
                >
                  Yes, fix it
                </button>
                <button
                  type="button"
                  className="sg-rec__btn sg-rec__btn--plain"
                  onClick={() => {
                    keptRef.current.add(spelling.text);
                    setSpell(null);
                  }}
                >
                  Keep mine
                </button>
              </div>
            </div>
          )}

          {checked && checked.status !== "ok" && checked.status !== "crisis" && (
            <p className={`sg-nudge${checked.status === "block" ? " is-block" : ""}`} role="status">
              {checked.message}
            </p>
          )}

          {checked?.status === "crisis" && (
            <div className="sg-crisis" role="alert">
              <p>{checked.message}</p>
              {checked.support?.phone ? (
                <a className="step-next sg-go" href={`tel:${checked.support.phone.replace(/\s/g, "")}`}>
                  Call {checked.support.name}: {checked.support.phone}
                </a>
              ) : null}
              <a className="sg-link" href={checked.support?.url ?? "https://findahelpline.com"} target="_blank" rel="noopener">
                Find a free helpline in your country
              </a>
            </div>
          )}

          {canListen && (
            <div className="sg-rec">
              <button
                type="button"
                className={`sg-rec__btn${listening ? " is-listening" : ""}`}
                onClick={toggleListen}
                disabled={listening}
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
                {listening ? "Recording…" : "Start voice recording"}
              </button>
              <button type="button" className="sg-rec__btn sg-rec__btn--stop" onClick={stopListening} disabled={!listening}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" />
                </svg>
                Stop recording
              </button>
            </div>
          )}

          <button type="button" className="step-next sg-go" onClick={() => void finish()} disabled={!canFinish}>
            Finish
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
          <p className="sg-small">Your words are not saved.</p>
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
    {lastScreen && <HappyBubble text="Something good is about to happen!" />}
    </>
  );
}
