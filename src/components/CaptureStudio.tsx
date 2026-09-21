"use client";

import Link from "next/link";
import { FormEvent, MouseEvent, useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import JoyPicker from "@/components/JoyPicker";
import StoryPlayback from "@/components/StoryPlayback";
import { LANDING, PHOTO_MAX_BYTES, getJoyById, type JoyType } from "@/lib/landing";
import { SILVER_LINING_NOTE, displayMoment } from "@/lib/prompts";
import type { CaptureRecord, SessionState, StoryRecord } from "@/lib/types";

type Health = {
  tokenFactory: boolean;
  storage: string;
  sonicListable: boolean;
};

function localDay() {
  return new Intl.DateTimeFormat("en-CA").format(new Date());
}

async function readJson<T>(res: Response): Promise<T> {
  const data = (await res.json()) as T & { error?: string };
  if (!res.ok) throw new Error(data.error || "Something went sideways.");
  return data;
}

function capturePayload(capture: CaptureRecord) {
  return {
    id: capture.id,
    kind: capture.kind,
    createdAt: capture.createdAt,
    day: capture.day,
    text: capture.text,
    transcript: capture.transcript,
    caption: capture.caption,
    goodMoment: capture.goodMoment,
    reframed: capture.reframed,
    ingestStatus: capture.ingestStatus,
    ingestModel: capture.ingestModel,
  };
}

function readLocalCaptures(day: string): CaptureRecord[] {
  try {
    const raw = window.sessionStorage.getItem(`gdn.captures.${day}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CaptureRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalCaptures(day: string, captures: CaptureRecord[]) {
  try {
    window.sessionStorage.setItem(`gdn.captures.${day}`, JSON.stringify(captures));
  } catch {
    // Private mode should not break capture.
  }
}

export default function CaptureStudio() {
  const photoInputId = useId();
  const [session, setSession] = useState<SessionState | null>(null);
  const [captures, setCaptures] = useState<CaptureRecord[]>([]);
  const [health, setHealth] = useState<Health | null>(null);
  const [email, setEmail] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [captureError, setCaptureError] = useState<string | null>(null);
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [weaveError, setWeaveError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"capture" | "unlock" | "weave" | null>(null);
  const [story, setStory] = useState<StoryRecord | null>(null);
  const [playing, setPlaying] = useState(false);
  const [selectedJoyId, setSelectedJoyId] = useState<string | null>(null);
  const [savedPair, setSavedPair] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const day = useMemo(localDay, []);
  const selectedJoy = getJoyById(selectedJoyId);
  const pairKey = photo && selectedJoy ? `${selectedJoy.id}:${photo.name}:${photo.size}:${photo.lastModified}` : null;

  const refresh = useCallback(async () => {
    const [sessionRes, captureRes] = await Promise.all([
      fetch(`/api/session?day=${day}`),
      fetch(`/api/captures?day=${day}`),
    ]);
    const sessionData = await readJson<SessionState & { health?: Health }>(sessionRes);
    const captureData = await readJson<{ captures: CaptureRecord[]; session: SessionState }>(
      captureRes,
    );
    setSession(captureData.session);
    const local = readLocalCaptures(day);
    const fromServer = captureData.captures;
    const merged =
      fromServer.length >= local.length
        ? fromServer
        : [
            ...fromServer,
            ...local.filter((item) => !fromServer.some((row) => row.id === item.id)),
          ];
    setCaptures(merged);
    writeLocalCaptures(day, merged);
    setStory(captureData.session.lastStory);
    if (sessionData.health) setHealth(sessionData.health);
  }, [day]);

  useEffect(() => {
    refresh().catch((err: Error) => setCaptureError(err.message));
  }, [refresh]);

  useEffect(() => {
    return () => {
      if (photoUrl) URL.revokeObjectURL(photoUrl);
      window.speechSynthesis?.cancel();
    };
  }, [photoUrl]);

  function takePhoto(file: File | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setCaptureError("Choose a photo — a still from the day.");
      return;
    }
    if (file.size > PHOTO_MAX_BYTES) {
      setCaptureError("Keep photos under 4.5 MB.");
      return;
    }
    setCaptureError(null);
    setPhoto(file);
    setPhotoUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return URL.createObjectURL(file);
    });
  }

  function pickJoy(joy: JoyType) {
    setSelectedJoyId(joy.id);
    setCaptureError(null);
  }

  async function weaveCaptures(nextCaptures: CaptureRecord[], nextSession: SessionState | null) {
    setBusy("weave");
    setWeaveError(null);
    try {
      const res = await fetch("/api/weave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          day,
          email: nextSession?.email || email,
          captures: nextCaptures.map(capturePayload),
        }),
      });
      const data = await readJson<{ story: StoryRecord; session: SessionState }>(res);
      setStory(data.story);
      setSession(data.session);
      window.requestAnimationFrame(() => {
        document.getElementById("yours")?.scrollIntoView({
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
          block: "start",
        });
      });
      return data.story;
    } catch (err) {
      setWeaveError(err instanceof Error ? err.message : "Weave failed.");
      return null;
    } finally {
      setBusy(null);
    }
  }

  async function savePhotoJoy(): Promise<{
    captures: CaptureRecord[];
    session: SessionState;
  } | null> {
    if (!selectedJoy || !photo) {
      setCaptureError(photo ? "Pick the kind of quiet joy first." : "Add one photo from today.");
      return null;
    }
    if (savedPair === pairKey && captures.length > 0 && session) {
      return { captures, session };
    }
    setBusy("capture");
    setCaptureError(null);
    try {
      const form = new FormData();
      form.set("kind", "photo");
      form.set("day", day);
      form.set("caption", selectedJoy.title);
      form.set("spellDecision", "keep");
      form.set("file", photo, photo.name || "moment.jpg");
      const res = await fetch("/api/captures", { method: "POST", body: form });
      const data = (await res.json()) as {
        capture?: CaptureRecord;
        session?: SessionState;
        error?: string;
      };
      if (!res.ok || !data.capture || !data.session) {
        throw new Error(data.error || "Something went sideways.");
      }
      const nextCaptures = [...captures, data.capture];
      setSession(data.session);
      setCaptures(nextCaptures);
      writeLocalCaptures(day, nextCaptures);
      setSavedPair(pairKey);
      return { captures: nextCaptures, session: data.session };
    } catch (err) {
      setCaptureError(err instanceof Error ? err.message : "Could not save that moment.");
      return null;
    } finally {
      setBusy(null);
    }
  }

  async function openYours(event: MouseEvent<HTMLAnchorElement>) {
    if (story) return;
    event.preventDefault();
    const saved = await savePhotoJoy();
    if (!saved) return;
    if (!saved.session.email) {
      document.getElementById("email-heading")?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
        block: "start",
      });
      return;
    }
    await weaveCaptures(saved.captures, saved.session);
  }

  async function unlockEmail(event: FormEvent) {
    event.preventDefault();
    setBusy("unlock");
    setUnlockError(null);
    try {
      const res = await fetch("/api/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          day,
          captures: captures.map(capturePayload),
        }),
      });
      const data = await readJson<{ session: SessionState }>(res);
      setSession(data.session);
      if (captures.length >= 1) {
        await weaveCaptures(captures, data.session);
      }
    } catch (err) {
      setUnlockError(err instanceof Error ? err.message : "Could not save email.");
    } finally {
      setBusy(null);
    }
  }

  function speakStory(record: StoryRecord) {
    window.speechSynthesis?.cancel();
    if (record.tts.status === "sonic") {
      const audio = audioRef.current ?? new Audio("/api/story/audio");
      audioRef.current = audio;
      audio.src = `/api/story/audio?t=${record.id}`;
      void audio.play();
      setPlaying(true);
      audio.onended = () => setPlaying(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(`${record.title}. ${record.body}`);
    utterance.rate = 0.82;
    utterance.pitch = 0.88;
    const voices = window.speechSynthesis?.getVoices() ?? [];
    const voice =
      voices.find((item) => /samantha|victoria|karen|moira|fiona/i.test(item.name)) ||
      voices.find((item) => /en[-_]?GB/i.test(item.lang) && /female|google/i.test(item.name)) ||
      voices.find((item) => /en[-_]?US/i.test(item.lang) && /female|google/i.test(item.name));
    if (voice) utterance.voice = voice;
    utterance.onend = () => setPlaying(false);
    setPlaying(true);
    window.speechSynthesis?.speak(utterance);
  }

  function stopStory() {
    window.speechSynthesis?.cancel();
    audioRef.current?.pause();
    setPlaying(false);
  }

  const unlocked = Boolean(session?.email);
  const showEmail = !unlocked && captures.length >= 1;
  const yoursReady = Boolean((photo && selectedJoy) || story);

  return (
    <div className="page">
      <header className="site-header">
        <Link className="badge" href="/">
          Gooddaynight
        </Link>
        <span className="header-meta">
          {health?.tokenFactory ? "Token Factory" : "Demo mode"} · {health?.storage ?? "…"}
        </span>
      </header>

      <main id="main">
        <section className="card card--mint card--compact" aria-labelledby="app-moment-heading">
          <h1 id="app-moment-heading">{LANDING.moment.title}</h1>
        </section>

        <section className="card card--dark" aria-labelledby="capture-heading">
          <span className="pill">Photo</span>
          <h2 id="capture-heading" className="visually-hidden">
            Add a photo
          </h2>
          <p className="cta-copy" style={{ marginTop: 0 }}>
            {LANDING.app.photoHelp}
          </p>
          <div className="studio">
            <label className="btn btn--ghost" htmlFor={photoInputId}>
              {photo ? "Choose another photo" : "Take or upload a photo"}
            </label>
            <input
              id={photoInputId}
              className="visually-hidden"
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(event) => {
                takePhoto(event.target.files?.[0] ?? null);
                event.target.value = "";
              }}
            />
            {photoUrl ? (
              // User-selected blob preview — next/image cannot optimize object URLs.
              // eslint-disable-next-line @next/next/no-img-element
              <img className="photo-preview" src={photoUrl} alt="Selected moment from today" />
            ) : null}
          </div>
          {captureError ? (
            <p className="error" role="alert">
              {captureError}
            </p>
          ) : null}
        </section>

        <section className="card card--cream card--moment card--compact" aria-labelledby="joy-heading">
          <h2 id="joy-heading" className="visually-hidden">
            What kind of quiet joy was it?
          </h2>
          <JoyPicker
            name="quiet-joy-app"
            idPrefix="app-joy"
            selectedId={selectedJoyId}
            onSelect={pickJoy}
          />
          <span className="card__wash card__wash--note" aria-hidden="true"></span>
        </section>

        {yoursReady ? (
          <section className="card card--lime card--compact" aria-label={LANDING.app.yours}>
            <a
              className="yours"
              href="#yours"
              onClick={(event) => {
                void openYours(event);
              }}
            >
              {busy === "capture" || busy === "weave" ? "…" : LANDING.app.yours}
            </a>
          </section>
        ) : null}

        <section className="card card--cream card--compact" aria-labelledby="today-heading">
          <h2 id="today-heading">Today’s moments</h2>
          {captures.length === 0 ? (
            <p className="card__body" style={{ marginTop: "0.8rem" }}>
              Nothing saved yet. One moment is enough.
            </p>
          ) : (
            <div className="moment-list">
              {captures.map((capture) => {
                const shown = displayMoment(capture);
                return (
                  <article className="moment" key={capture.id}>
                    <span className="moment__kind">{capture.kind}</span>
                    <p>{shown.line}</p>
                    {shown.reframed && <p className="moment__note">{SILVER_LINING_NOTE}</p>}
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {showEmail && (
          <section className="card card--dark card--compact" aria-labelledby="email-heading">
            <span className="pill">Unlock</span>
            <h2 id="email-heading">Hear your own good-moments story</h2>
            <p className="cta-copy">
              Email unlocks playback. Your vault stays private — keyed to you, never sent elsewhere.
            </p>
            <form className="studio" onSubmit={unlockEmail} style={{ marginTop: "1rem" }}>
              <label className="visually-hidden" htmlFor="unlock-email">
                Email
              </label>
              <input
                id="unlock-email"
                type="email"
                autoComplete="email"
                inputMode="email"
                spellCheck={false}
                required
                placeholder="you@email.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
              {unlockError && (
                <p className="error" role="alert">
                  {unlockError}
                </p>
              )}
              <button className="btn btn--lime" type="submit" disabled={Boolean(busy)}>
                {busy === "unlock" ? "Unlocking…" : "Unlock my story"}
              </button>
            </form>
          </section>
        )}

        {weaveError && !story ? (
          <p className="error" role="alert">
            {weaveError}
          </p>
        ) : null}

        {story && (
          <section
            id="yours"
            className="card card--peach card--compact"
            aria-labelledby="yours-heading"
          >
            <h2 id="yours-heading" className="visually-hidden">
              {LANDING.app.yours}
            </h2>
            <div className="story-body">
              <StoryPlayback id="app-story-playback" title={story.title}>
                <p className="playback__story">{story.body}</p>
              </StoryPlayback>
              <div className="actions" style={{ marginTop: "0.2rem" }}>
                <button
                  className="btn"
                  type="button"
                  onClick={() => (playing ? stopStory() : speakStory(story))}
                  style={{ color: "var(--navy)", borderColor: "rgba(22,50,74,0.25)" }}
                >
                  {playing ? "Pause" : "Replay last night"}
                </button>
              </div>
              {weaveError && (
                <p className="error" role="alert">
                  {weaveError}
                </p>
              )}
              <div className="status-row">
                <span className="chip">
                  {story.mock ? "Joyful stand-in (add NEBIUS_API_KEY for Super)" : story.weaveModel}
                </span>
                <span className="chip">
                  {story.tts.status === "sonic" ? "Sonic voice" : "Browser voice (Sonic coming)"}
                </span>
              </div>
            </div>
          </section>
        )}
      </main>

      <footer className="site-footer">
        <p>
          <Link href="/">Back to Gooddaynight</Link>
        </p>
      </footer>
    </div>
  );
}
