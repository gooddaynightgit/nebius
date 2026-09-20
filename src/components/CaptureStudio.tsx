"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CaptureKind, CaptureRecord, SessionState, StoryRecord } from "@/lib/types";

type Mode = CaptureKind;

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

export default function CaptureStudio() {
  const [mode, setMode] = useState<Mode>("text");
  const [session, setSession] = useState<SessionState | null>(null);
  const [captures, setCaptures] = useState<CaptureRecord[]>([]);
  const [health, setHealth] = useState<Health | null>(null);
  const [text, setText] = useState("");
  const [caption, setCaption] = useState("");
  const [email, setEmail] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [voiceBlob, setVoiceBlob] = useState<Blob | null>(null);
  const [transcript, setTranscript] = useState("");
  const [story, setStory] = useState<StoryRecord | null>(null);
  const [playing, setPlaying] = useState(false);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const day = useMemo(localDay, []);

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
    setCaptures(captureData.captures);
    setStory(captureData.session.lastStory);
    if (sessionData.health) setHealth(sessionData.health);
  }, [day]);

  useEffect(() => {
    refresh().catch((err: Error) => setError(err.message));
  }, [refresh]);

  useEffect(() => {
    return () => {
      if (photoUrl) URL.revokeObjectURL(photoUrl);
      if (timerRef.current) window.clearInterval(timerRef.current);
      window.speechSynthesis?.cancel();
    };
  }, [photoUrl]);

  async function saveCapture(fields: Record<string, string>, file?: Blob | File | null, filename?: string) {
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.set("kind", mode);
      form.set("day", day);
      for (const [key, value] of Object.entries(fields)) {
        if (value) form.set(key, value);
      }
      if (file) form.set("file", file, filename ?? "moment.bin");
      const res = await fetch("/api/captures", { method: "POST", body: form });
      const data = await readJson<{ capture: CaptureRecord; session: SessionState }>(res);
      setSession(data.session);
      setCaptures((prev) => [...prev, data.capture]);
      setText("");
      setCaption("");
      setTranscript("");
      setVoiceBlob(null);
      setPhoto(null);
      if (photoUrl) URL.revokeObjectURL(photoUrl);
      setPhotoUrl(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save that moment.");
    } finally {
      setBusy(false);
    }
  }

  async function onTextSubmit(event: FormEvent) {
    event.preventDefault();
    await saveCapture({ text });
  }

  async function onPhotoSubmit(event: FormEvent) {
    event.preventDefault();
    await saveCapture({ caption }, photo, photo?.name ?? "moment.jpg");
  }

  async function onVoiceSubmit(event: FormEvent) {
    event.preventDefault();
    await saveCapture(
      { transcript, caption },
      voiceBlob,
      "moment.webm",
    );
  }

  async function startRecording() {
    setError(null);
    setVoiceBlob(null);
    setTranscript("");
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setError("Microphone permission is needed for a voice note.");
      return;
    }
    const recorder = new MediaRecorder(stream);
    chunksRef.current = [];
    recorder.ondataavailable = (event) => {
      if (event.data.size) chunksRef.current.push(event.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
      setVoiceBlob(blob);
      stream.getTracks().forEach((track) => track.stop());
    };
    mediaRef.current = recorder;
    recorder.start();
    setRecording(true);
    setSeconds(0);
    timerRef.current = window.setInterval(() => setSeconds((n) => n + 1), 1000);

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";
      recognition.onresult = (event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => {
        let next = "";
        for (let i = 0; i < event.results.length; i += 1) {
          next += event.results[i][0].transcript;
        }
        setTranscript(next.trim());
      };
      recognition.start();
      recorder.addEventListener("stop", () => recognition.stop());
    }
  }

  function stopRecording() {
    mediaRef.current?.stop();
    setRecording(false);
    if (timerRef.current) window.clearInterval(timerRef.current);
  }

  async function unlockEmail(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await readJson<{ session: SessionState }>(res);
      setSession(data.session);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save email.");
    } finally {
      setBusy(false);
    }
  }

  async function weaveNow() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/weave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          day,
          captures: captures.map((c) => ({
            id: c.id,
            kind: c.kind,
            createdAt: c.createdAt,
            text: c.text,
            transcript: c.transcript,
            caption: c.caption,
            goodMoment: c.goodMoment,
            ingestStatus: c.ingestStatus,
          })),
        }),
      });
      const data = await readJson<{ story: StoryRecord; session: SessionState }>(res);
      setStory(data.story);
      setSession(data.session);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Weave failed.");
    } finally {
      setBusy(false);
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
    utterance.rate = 0.9;
    utterance.pitch = 0.95;
    const voice = window.speechSynthesis
      ?.getVoices()
      .find((item) => /en[-_]?US/i.test(item.lang) && /female|samantha|google/i.test(item.name));
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

  const showEmail = Boolean(session && session.captureCount >= 1 && !session.email);
  const canHear = Boolean(session?.canHearStory);

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
        <section className="card card--mint card--compact" aria-labelledby="drop-heading">
          <h1 id="drop-heading">Drop a moment from today.</h1>
          <p className="card__body" style={{ marginTop: "0.7rem" }}>
            Voice, photo, or a few words. Nothing leaves your private vault.
          </p>
        </section>

        <section className="card card--dark" aria-labelledby="capture-heading">
          <span className="pill">Capture</span>
          <h2 id="capture-heading" className="visually-hidden">
            Add a moment
          </h2>
          <div className="mode-row" role="tablist" aria-label="Capture type">
            {(["voice", "photo", "text"] as Mode[]).map((item) => (
              <button
                key={item}
                type="button"
                role="tab"
                aria-pressed={mode === item}
                onClick={() => setMode(item)}
              >
                {item === "voice" ? "Voice" : item === "photo" ? "Photo" : "Text"}
              </button>
            ))}
          </div>

          {mode === "text" && (
            <form className="studio" onSubmit={onTextSubmit}>
              <label className="visually-hidden" htmlFor="moment-text">
                Text note
              </label>
              <textarea
                id="moment-text"
                value={text}
                onChange={(event) => setText(event.target.value)}
                placeholder="the laugh, the small win, the quiet moment"
                required
              />
              <button className="btn btn--lime" type="submit" disabled={busy}>
                Save this moment
              </button>
            </form>
          )}

          {mode === "photo" && (
            <form className="studio" onSubmit={onPhotoSubmit}>
              <label className="btn btn--ghost" htmlFor="moment-photo">
                {photo ? "Choose another photo" : "Take or upload a photo"}
              </label>
              <input
                id="moment-photo"
                className="visually-hidden"
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  setPhoto(file);
                  if (photoUrl) URL.revokeObjectURL(photoUrl);
                  setPhotoUrl(file ? URL.createObjectURL(file) : null);
                }}
              />
              {photoUrl && <img className="photo-preview" src={photoUrl} alt="Selected moment" />}
              <input
                type="text"
                value={caption}
                onChange={(event) => setCaption(event.target.value)}
                placeholder="What was good here? (optional)"
              />
              <button className="btn btn--lime" type="submit" disabled={busy || !photo}>
                Keep this photo
              </button>
            </form>
          )}

          {mode === "voice" && (
            <form className="studio" onSubmit={onVoiceSubmit}>
              <div className="record">
                <button
                  type="button"
                  className={`record__btn ${recording ? "is-live" : ""}`}
                  onClick={() => (recording ? stopRecording() : startRecording())}
                >
                  {recording ? "Stop" : "Rec"}
                </button>
                <div className="record__time">
                  {Math.floor(seconds / 60)
                    .toString()
                    .padStart(2, "0")}
                  :{(seconds % 60).toString().padStart(2, "0")}
                </div>
              </div>
              <input
                type="text"
                value={transcript || caption}
                onChange={(event) => {
                  setTranscript(event.target.value);
                  setCaption(event.target.value);
                }}
                placeholder="Transcript or a line about the sound (optional)"
              />
              <button className="btn btn--lime" type="submit" disabled={busy || (!voiceBlob && !transcript)}>
                Save this voice note
              </button>
            </form>
          )}

          {error && <p className="error">{error}</p>}
        </section>

        <section className="card card--cream card--compact" aria-labelledby="today-heading">
          <h2 id="today-heading">Today’s moments</h2>
          {captures.length === 0 ? (
            <p className="card__body" style={{ marginTop: "0.8rem" }}>
              Nothing saved yet. One moment is enough.
            </p>
          ) : (
            <div className="moment-list">
              {captures.map((capture) => (
                <article className="moment" key={capture.id}>
                  <span className="moment__kind">{capture.kind}</span>
                  <p>{capture.goodMoment || capture.text || capture.transcript || capture.caption}</p>
                </article>
              ))}
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
              <button className="btn btn--lime" type="submit" disabled={busy}>
                Unlock my story
              </button>
            </form>
          </section>
        )}

        {canHear && (
          <section className="card card--peach card--compact" aria-labelledby="weave-heading">
            <h2 id="weave-heading">Tonight’s story</h2>
            <div className="actions" style={{ marginTop: "1rem" }}>
              <button
                className="btn btn--lime"
                type="button"
                onClick={weaveNow}
                disabled={busy || captures.length === 0}
              >
                Weave now
              </button>
              {story && (
                <button
                  className="btn"
                  type="button"
                  onClick={() => (playing ? stopStory() : speakStory(story))}
                  style={{ color: "var(--navy)", borderColor: "rgba(22,50,74,0.25)" }}
                >
                  {playing ? "Pause" : "Replay last night"}
                </button>
              )}
            </div>
            {story && (
              <div className="story-body" style={{ marginTop: "1.1rem" }}>
                <h3 style={{ margin: 0 }}>{story.title}</h3>
                <p>{story.body}</p>
                <div className="status-row">
                  <span className="chip">{story.mock ? "Demo weave" : story.weaveModel}</span>
                  <span className="chip">
                    {story.tts.status === "sonic" ? "Sonic voice" : "Calm browser voice"}
                  </span>
                </div>
              </div>
            )}
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
