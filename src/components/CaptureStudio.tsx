"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import JoyPicker from "@/components/JoyPicker";
import StoryPlayback from "@/components/StoryPlayback";
import { proposeSpokenLine } from "@/lib/care";
import { LANDING, getJoyById, type JoyType } from "@/lib/landing";
import { SILVER_LINING_NOTE, displayMoment } from "@/lib/prompts";
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

type SpellPending = {
  field: "text" | "transcript" | "caption";
  original: string;
  corrected: string;
  fields: Record<string, string>;
  file?: Blob | File | null;
  filename?: string;
};

function spokenField(fields: Record<string, string>): "text" | "transcript" | "caption" {
  if (fields.transcript) return "transcript";
  if (fields.text) return "text";
  return "caption";
}

async function fetchProposal(original: string) {
  const local = proposeSpokenLine(original);
  try {
    const res = await fetch("/api/spellfix", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: original }),
    });
    if (res.ok) {
      const data = (await res.json()) as {
        original: string;
        corrected: string;
        changed: boolean;
      };
      if (data.corrected) return data;
    }
  } catch {
    // Local proposal is enough.
  }
  return local;
}

function writeLocalCaptures(day: string, captures: CaptureRecord[]) {
  try {
    window.sessionStorage.setItem(`gdn.captures.${day}`, JSON.stringify(captures));
  } catch {
    // Private mode should not break capture.
  }
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
  const [captureError, setCaptureError] = useState<string | null>(null);
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [weaveError, setWeaveError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"capture" | "unlock" | "weave" | null>(null);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [voiceBlob, setVoiceBlob] = useState<Blob | null>(null);
  const [transcript, setTranscript] = useState("");
  const [story, setStory] = useState<StoryRecord | null>(null);
  const [playing, setPlaying] = useState(false);
  const [spellPending, setSpellPending] = useState<SpellPending | null>(null);
  const [selectedJoyId, setSelectedJoyId] = useState<string | null>(null);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const recordingRef = useRef(false);
  const finalsRef = useRef("");
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
      if (timerRef.current) window.clearInterval(timerRef.current);
      recordingRef.current = false;
      try {
        recognitionRef.current?.stop();
      } catch {
        // Ignore.
      }
      window.speechSynthesis?.cancel();
    };
  }, [photoUrl]);

  async function saveCapture(
    fields: Record<string, string>,
    file?: Blob | File | null,
    filename?: string,
  ) {
    setBusy("capture");
    setCaptureError(null);
    try {
      const form = new FormData();
      form.set("kind", mode);
      form.set("day", day);
      for (const [key, value] of Object.entries(fields)) {
        if (value) form.set(key, value);
      }
      if (file) form.set("file", file, filename ?? "moment.bin");
      const res = await fetch("/api/captures", { method: "POST", body: form });
      const data = (await res.json()) as {
        capture?: CaptureRecord;
        session?: SessionState;
        error?: string;
        needsConfirm?: boolean;
        original?: string;
        corrected?: string;
      };
      if (res.status === 409 && data.needsConfirm && data.original && data.corrected) {
        setSpellPending({
          field: spokenField(fields),
          original: data.original,
          corrected: data.corrected,
          fields,
          file,
          filename,
        });
        return;
      }
      if (!res.ok || !data.capture || !data.session) {
        throw new Error(data.error || "Something went sideways.");
      }
      setSession(data.session);
      setCaptures((prev) => {
        const next = [...prev, data.capture as CaptureRecord];
        writeLocalCaptures(day, next);
        return next;
      });
      setSpellPending(null);
      setText("");
      setCaption("");
      setTranscript("");
      setVoiceBlob(null);
      setPhoto(null);
      if (photoUrl) URL.revokeObjectURL(photoUrl);
      setPhotoUrl(null);
    } catch (err) {
      setCaptureError(err instanceof Error ? err.message : "Could not save that moment.");
    } finally {
      setBusy(null);
    }
  }

  async function beginSave(
    fields: Record<string, string>,
    file?: Blob | File | null,
    filename?: string,
  ) {
    setCaptureError(null);
    const field = spokenField(fields);
    const original = (fields[field] || "").trim();
    if (original) {
      setBusy("capture");
      const proposal = await fetchProposal(original);
      setBusy(null);
      if (proposal.changed) {
        setSpellPending({
          field,
          original: proposal.original,
          corrected: proposal.corrected,
          fields,
          file,
          filename,
        });
        return;
      }
    }
    await saveCapture({ ...fields, spellDecision: "none" }, file, filename);
  }

  async function confirmSpell(decision: "corrected" | "keep") {
    if (!spellPending) return;
    const next = { ...spellPending.fields };
    if (decision === "corrected") {
      next[spellPending.field] = spellPending.corrected;
    }
    setSpellPending(null);
    await saveCapture(
      { ...next, spellDecision: decision },
      spellPending.file,
      spellPending.filename,
    );
  }

  async function onTextSubmit(event: FormEvent) {
    event.preventDefault();
    await beginSave({ text });
  }

  async function onPhotoSubmit(event: FormEvent) {
    event.preventDefault();
    const joy = getJoyById(selectedJoyId);
    await beginSave(
      { caption: caption.trim() || joy?.title || "" },
      photo,
      photo?.name ?? "moment.jpg",
    );
  }

  function pickJoy(joy: JoyType) {
    setSelectedJoyId(joy.id);
    setMode("photo");
  }

  async function onVoiceSubmit(event: FormEvent) {
    event.preventDefault();
    const spoken = (transcript || caption).trim();
    if (!spoken) {
      setCaptureError(
        "Type a line about what you said — we need your words to tell tonight's story.",
      );
      return;
    }
    await beginSave({ transcript: spoken }, voiceBlob, "moment.webm");
  }

  function attachSpeechRecognition() {
    const SpeechRecognitionCtor =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) {
      setCaptureError(
        "This browser can't hear words automatically. Type what you said after you record.",
      );
      return;
    }
    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const piece = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalsRef.current = `${finalsRef.current} ${piece}`.replace(/\s+/g, " ").trim();
        } else {
          interim += piece;
        }
      }
      setTranscript(`${finalsRef.current} ${interim}`.replace(/\s+/g, " ").trim());
    };
    recognition.onerror = () => {
      if (!finalsRef.current.trim()) {
        setCaptureError(
          "Couldn't catch the words. Type a line about what you said so we can tell your story.",
        );
      }
    };
    recognition.onend = () => {
      if (recordingRef.current) {
        try {
          recognition.start();
        } catch {
          // Chrome throws if a restart races a stop.
        }
      }
    };
    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      setCaptureError(
        "Couldn't start listening. Type a line about what you said after you record.",
      );
    }
  }

  async function startRecording() {
    setCaptureError(null);
    setVoiceBlob(null);
    setTranscript("");
    finalsRef.current = "";
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setCaptureError("Microphone permission is needed for a voice note.");
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
    recordingRef.current = true;
    setRecording(true);
    setSeconds(0);
    timerRef.current = window.setInterval(() => setSeconds((n) => n + 1), 1000);
    attachSpeechRecognition();
  }

  function stopRecording() {
    recordingRef.current = false;
    mediaRef.current?.stop();
    setRecording(false);
    if (timerRef.current) window.clearInterval(timerRef.current);
    const recognition = recognitionRef.current;
    recognitionRef.current = null;
    try {
      recognition?.stop();
    } catch {
      // Already stopped.
    }
    window.setTimeout(() => {
      setTranscript((current) => current.trim() || finalsRef.current.trim());
    }, 600);
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
    } catch (err) {
      setUnlockError(err instanceof Error ? err.message : "Could not save email.");
    } finally {
      setBusy(null);
    }
  }

  async function weaveNow() {
    setBusy("weave");
    setWeaveError(null);
    try {
      const res = await fetch("/api/weave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          day,
          email: session?.email || email,
          captures: captures.map(capturePayload),
        }),
      });
      const data = await readJson<{ story: StoryRecord; session: SessionState }>(res);
      setStory(data.story);
      setSession(data.session);
    } catch (err) {
      setWeaveError(err instanceof Error ? err.message : "Weave failed.");
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
  const canHear = unlocked && captures.length >= 1;

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
                spellCheck
                required
              />
              <button className="btn btn--lime" type="submit" disabled={Boolean(busy)}>
                {busy === "capture" ? "Saving…" : "Save this moment"}
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
                placeholder={
                  getJoyById(selectedJoyId)?.capture ?? "What was good here? (optional)"
                }
                spellCheck
              />
              <button className="btn btn--lime" type="submit" disabled={Boolean(busy) || !photo}>
                {busy === "capture" ? "Saving…" : "Keep this photo"}
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
                  {recording ? " · listening" : ""}
                </div>
              </div>
              <input
                type="text"
                value={transcript}
                required
                onChange={(event) => setTranscript(event.target.value)}
                placeholder="What you said — we'll type it if we can hear you"
                spellCheck
              />
              <p className="cta-copy">
                We listen while you record. If the line is empty after Stop, type the words —
                tonight's story needs them.
              </p>
              <button
                className="btn btn--lime"
                type="submit"
                disabled={Boolean(busy) || !transcript.trim()}
              >
                {busy === "capture" ? "Saving…" : "Save this voice note"}
              </button>
            </form>
          )}

          {spellPending && (
            <div className="spell-confirm" role="dialog" aria-labelledby="spell-heading">
              <h3 id="spell-heading">Save corrected version?</h3>
              <p className="spell-confirm__pair">
                <span>Typed</span>
                {spellPending.original}
              </p>
              <p className="spell-confirm__pair">
                <span>Corrected</span>
                {spellPending.corrected}
              </p>
              <div className="actions">
                <button
                  className="btn btn--lime"
                  type="button"
                  onClick={() => confirmSpell("corrected")}
                  disabled={Boolean(busy)}
                >
                  Yes, save this
                </button>
                <button
                  className="btn"
                  type="button"
                  onClick={() => confirmSpell("keep")}
                  disabled={Boolean(busy)}
                  style={{ color: "var(--cream)", borderColor: "rgba(247,244,232,0.28)" }}
                >
                  Keep as typed
                </button>
              </div>
            </div>
          )}

          {captureError && <p className="error">{captureError}</p>}
        </section>

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

        {canHear && (
          <section className="card card--peach card--compact" aria-labelledby="weave-heading">
            <h2 id="weave-heading">Tonight’s story</h2>
            <div className="actions" style={{ marginTop: "1rem" }}>
              <button
                className="btn btn--lime"
                type="button"
                onClick={weaveNow}
                disabled={Boolean(busy) || captures.length === 0}
              >
                {busy === "weave" ? "Weaving…" : "Weave now"}
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
            {weaveError && (
              <p className="error" role="alert">
                {weaveError}
              </p>
            )}
            {story && (
              <div className="story-body" style={{ marginTop: "1.1rem" }}>
                <StoryPlayback id="app-story-playback" title={story.title}>
                  <p className="playback__story">{story.body}</p>
                </StoryPlayback>
                <div className="status-row">
                  <span className="chip">
                    {story.mock ? "Joyful stand-in (add NEBIUS_API_KEY for Super)" : story.weaveModel}
                  </span>
                  <span className="chip">
                    {story.tts.status === "sonic" ? "Sonic voice" : "Browser voice (Sonic coming)"}
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
