"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import JoyPicker from "@/components/JoyPicker";
import { captionDisposition } from "@/lib/app-capture";
import {
  clearCaptureStashIfOpened,
  readCaptureStash,
  readPendingPhoto,
  clearPendingPhoto,
  stashPhotoFile,
  writeCaptureStash,
} from "@/lib/capture-stash";
import {
  JOY_NEED,
  explainClientFetchError,
  isReachabilityError,
  readJson,
} from "@/lib/client-fetch";
import { localDay } from "@/lib/day";
import { applyJoyMatchChoice, suggestJoyId } from "@/lib/joy-match";
import {
  LANDING,
  WHISPER_MAX,
  accordionJoys,
  getJoyById,
  type JoyType,
} from "@/lib/landing";
import { PHOTO_DATE_MESSAGES } from "@/lib/photo";
import type { SessionState } from "@/lib/types";

const JOY_PAGE_LEGEND = (
  <>
    {LANDING.app.joyQuestion} <em>{LANDING.app.joyPickHint}</em>
  </>
);

export default function JoyStudio() {
  const captionId = useId();
  const [session, setSession] = useState<SessionState | null>(null);
  const [caption, setCaption] = useState("");
  const [selectedJoyId, setSelectedJoyId] = useState<string | null>(null);
  const [captureError, setCaptureError] = useState<string | null>(null);
  const [joyError, setJoyError] = useState<string | null>(null);
  const [dateNote, setDateNote] = useState<string | null>(null);
  const [captionNote, setCaptionNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [phoneStash, setPhoneStash] = useState(false);
  const [phoneNote, setPhoneNote] = useState<string | null>(null);
  const [captionOpen, setCaptionOpen] = useState(false);
  const [mismatch, setMismatch] = useState<{ line: string; suggestedJoyId: string | null } | null>(
    null,
  );
  const [photoNeedNote, setPhotoNeedNote] = useState<string | null>(null);
  const [witnessNote, setWitnessNote] = useState<string | null>(null);
  const [captionScroll, setCaptionScroll] = useState(0);
  const [mismatchScroll, setMismatchScroll] = useState(0);
  const matchSeq = useRef(0);
  const photoRef = useRef<File | null>(null);
  const witnessNoted = useRef(false);

  const day = useMemo(() => localDay(), []);
  const selectedJoy = getJoyById(selectedJoyId);
  const opened = Boolean(session?.yoursOpened);
  const savedPhoto = session?.todayPhoto ?? null;
  const yoursReady = Boolean(savedPhoto) || phoneStash;
  const joys = useMemo(() => {
    const base = accordionJoys();
    if (selectedJoy && !base.some((joy) => joy.id === selectedJoy.id)) {
      return [...base, selectedJoy];
    }
    return base;
  }, [selectedJoy]);

  const refresh = useCallback(async () => {
    try {
      const [sessionRes, stash, pending] = await Promise.all([
        fetch(`/api/session?day=${day}`, { credentials: "same-origin" }),
        readCaptureStash(day),
        readPendingPhoto(day),
      ]);
      const sessionData = await readJson<SessionState>(sessionRes);
      setSession(sessionData);
      if (sessionData.yoursOpened) {
        await clearCaptureStashIfOpened(day, true);
      }
      if (pending && pending.size > 0) photoRef.current = pending;
      else if (!sessionData.yoursOpened && stash?.photo && stash.photo.size > 0) {
        photoRef.current = stashPhotoFile(stash);
      }
      const hasStash = Boolean(stash) && !sessionData.yoursOpened;
      setPhoneStash(hasStash);
      const phoneOnly = hasStash && !sessionData.todayPhoto && !sessionData.yoursOpened;
      setPhoneNote(phoneOnly ? LANDING.app.savedOnPhone : null);
      if (!hydrated && !pending && (sessionData.todayPhoto || stash)) {
        setSelectedJoyId(sessionData.todayPhoto?.joyType ?? stash?.joyType ?? null);
        setCaption(sessionData.todayPhoto?.caption ?? stash?.caption ?? "");
        setCaptionOpen(true);
        if (sessionData.todayPhoto && !sessionData.todayPhoto.dateVerified) {
          setDateNote(PHOTO_DATE_MESSAGES.unverified);
        }
      }
      setHydrated(true);
      setCaptureError((current) => (isReachabilityError(current) ? null : current));
    } catch (error) {
      setCaptureError(explainClientFetchError(error));
    }
  }, [day, hydrated]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!captionScroll) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const frame = window.requestAnimationFrame(() => {
      document.getElementById("caption-box")?.scrollIntoView({
        behavior: reduce ? "auto" : "smooth",
        block: "start",
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [captionScroll]);

  useEffect(() => {
    if (!mismatch || !mismatchScroll) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const frame = window.requestAnimationFrame(() => {
      document.getElementById("joy-mismatch")?.scrollIntoView({
        behavior: reduce ? "auto" : "smooth",
        block: "nearest",
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [mismatch, mismatchScroll]);

  function revealCaption() {
    setMismatch(null);
    setPhotoNeedNote(null);
    setCaptionOpen(true);
    setCaptionScroll((n) => n + 1);
  }

  function noteWitnessQuiet(note: string) {
    if (witnessNoted.current) return;
    witnessNoted.current = true;
    setWitnessNote(note);
  }

  async function photoForMatch(): Promise<File | null> {
    const current = photoRef.current;
    if (current && current.size > 0) return current;
    const pending = await readPendingPhoto(day);
    if (pending && pending.size > 0) {
      photoRef.current = pending;
      return pending;
    }
    const stash = await readCaptureStash(day);
    if (stash?.photo && stash.photo.size > 0) {
      const stashed = stashPhotoFile(stash);
      if (stashed.size > 0) {
        photoRef.current = stashed;
        return stashed;
      }
    }
    if (!savedPhoto?.id) return null;
    try {
      const res = await fetch(`/api/media/${savedPhoto.id}`, { credentials: "same-origin" });
      if (!res.ok) return null;
      const blob = await res.blob();
      if (!blob.size) return null;
      const file = new File([blob], "moment.jpg", { type: blob.type || "image/jpeg" });
      photoRef.current = file;
      return file;
    } catch {
      return null;
    }
  }

  async function runJoyMatch(joy: JoyType, fileOverride?: File) {
    const seq = ++matchSeq.current;
    setMismatch(null);
    const override = fileOverride && fileOverride.size > 0 ? fileOverride : null;
    const file = override ?? (await photoForMatch());
    if (seq !== matchSeq.current) return;
    if (!file) {
      setPhotoNeedNote(LANDING.app.photoNeed);
      return;
    }
    setPhotoNeedNote(null);
    try {
      const form = new FormData();
      form.set("joy_type", joy.id);
      form.set("joyType", joy.id);
      form.set("file", file, file.name || "moment.jpg");
      const res = await fetch("/api/joy-match", {
        method: "POST",
        body: form,
        credentials: "same-origin",
      });
      const data = await readJson<{
        verdict?: string;
        line?: string;
        note?: string;
        suggestedJoyId?: string | null;
      }>(res);
      if (seq !== matchSeq.current) return;
      if (data.verdict === "NEED_PHOTO") {
        setPhotoNeedNote(LANDING.app.photoNeed);
        return;
      }
      if (data.verdict === "UNAVAILABLE") {
        noteWitnessQuiet(data.note?.trim() || LANDING.app.witnessQuiet);
        revealCaption();
        return;
      }
      if (data.verdict === "MISMATCH" && data.line?.trim()) {
        const line = data.line.trim();
        setCaptionOpen(false);
        setMismatch({
          line,
          suggestedJoyId: data.suggestedJoyId || suggestJoyId(line),
        });
        setMismatchScroll((n) => n + 1);
        return;
      }
      revealCaption();
    } catch {
      if (seq !== matchSeq.current) return;
      revealCaption();
    }
  }

  function chooseJoyMatch(choice: "switch" | "keep") {
    matchSeq.current += 1;
    const next = applyJoyMatchChoice({
      choice,
      currentJoyId: selectedJoyId ?? "",
      suggestedJoyId: mismatch?.suggestedJoyId ?? null,
    });
    if (next.joyId) setSelectedJoyId(next.joyId);
    revealCaption();
  }

  function pickJoy(joy: JoyType) {
    setSelectedJoyId(joy.id);
    setJoyError(null);
    setCaptureError(null);
    const current = photoRef.current;
    void runJoyMatch(joy, current && current.size > 0 ? current : undefined);
  }

  async function saveMoment(event: FormEvent) {
    event.preventDefault();
    const pending = await readPendingPhoto(day);
    const existingStash = await readCaptureStash(day);
    const uploadPhoto =
      (photoRef.current && photoRef.current.size > 0 ? photoRef.current : null) ??
      (pending && pending.size > 0 ? pending : null) ??
      (existingStash ? stashPhotoFile(existingStash) : null);
    if (!uploadPhoto && !savedPhoto) {
      setPhotoNeedNote(LANDING.app.photoNeed);
      setCaptureError(null);
      return;
    }
    if (!selectedJoy) {
      setJoyError(JOY_NEED);
      setCaptureError(null);
      window.requestAnimationFrame(() => {
        document.getElementById("joy-pick")?.scrollIntoView({
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
          block: "start",
        });
      });
      return;
    }
    const kept = captionDisposition(caption);
    setBusy(true);
    setCaptureError(null);
    setJoyError(null);
    setCaptionNote(kept.dropped ? LANDING.app.captionDropped : null);
    if (kept.dropped) setCaption("");
    try {
      const form = new FormData();
      form.set("source", "app");
      form.set("kind", "photo");
      form.set("day", day);
      form.set("joyType", selectedJoy.id);
      form.set("tzOffset", String(new Date().getTimezoneOffset()));
      if (kept.caption) form.set("caption", kept.caption);
      if (uploadPhoto) form.set("file", uploadPhoto, uploadPhoto.name || "moment.jpg");
      const res = await fetch("/api/captures", {
        method: "POST",
        body: form,
        credentials: "same-origin",
      });
      const data = await readJson<{
        session?: SessionState;
        dateNote?: string;
        captionNote?: string;
      }>(res);
      if (!data.session) {
        throw new Error("Could not save that moment.");
      }
      if (uploadPhoto) {
        try {
          await writeCaptureStash({
            day,
            joyType: selectedJoy.id,
            caption: kept.caption,
            photo: uploadPhoto,
            fileName: uploadPhoto.name,
          });
        } catch {
          // Save already succeeded; YOURS can still try the in-memory file this session.
        }
        setPhoneStash(true);
      }
      await clearPendingPhoto();
      setCaptureError(null);
      setSession(data.session);
      if (data.dateNote) setDateNote(data.dateNote);
      if (data.captionNote) {
        setCaptionNote(data.captionNote);
        setCaption("");
      }
      let latest = data.session;
      try {
        const sessionRes = await fetch(`/api/session?day=${day}`, { credentials: "same-origin" });
        latest = await readJson<SessionState>(sessionRes);
        setSession(latest);
      } catch {
        latest = data.session;
      }
      if (!latest.todayPhoto) {
        setPhoneNote(LANDING.app.savedOnPhone);
      } else {
        setPhoneNote(null);
      }
      window.requestAnimationFrame(() => {
        document.getElementById("yours-door")?.scrollIntoView({
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
          block: "start",
        });
      });
    } catch (err) {
      setCaptureError(explainClientFetchError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <header className="site-header">
        <Link className="badge" href="/">
          {LANDING.app.brand}
        </Link>
      </header>

      <main id="main">
        <form onSubmit={saveMoment}>
          <section
            id="joy-pick"
            className="card card--cream card--moment"
            aria-labelledby="joy-heading"
          >
            <span className="pill">Joy</span>
            <h2 id="joy-heading" className="visually-hidden">
              {LANDING.app.joyQuestion}
            </h2>
            {joyError ? (
              <p className="error" role="alert" id="joy-need" style={{ margin: "0 0 0.85rem" }}>
                {joyError}
              </p>
            ) : null}
            {photoNeedNote ? (
              <p className="notice" style={{ margin: "0 0 0.85rem" }}>
                {photoNeedNote}{" "}
                <Link href="/app">{LANDING.app.takePhoto}</Link>
              </p>
            ) : null}
            <JoyPicker
              name="quiet-joy-app"
              idPrefix="app-joy"
              selectedId={selectedJoyId}
              onSelect={pickJoy}
              joys={joys}
              legend={JOY_PAGE_LEGEND}
            />
            {mismatch ? (
              <div id="joy-mismatch" className="joy-mismatch" role="status">
                <p className="joy-mismatch__line">{mismatch.line}</p>
                <div className="joy-mismatch__actions">
                  <button className="btn btn--ghost" type="button" onClick={() => chooseJoyMatch("switch")}>
                    {LANDING.app.switchJoy}
                  </button>
                  <button className="btn btn--ghost" type="button" onClick={() => chooseJoyMatch("keep")}>
                    {LANDING.app.keepMine}
                  </button>
                </div>
              </div>
            ) : null}
            {dateNote ? (
              <p className="notice" style={{ marginTop: "0.85rem" }}>
                {dateNote}
              </p>
            ) : null}
            {captionNote ? (
              <p className="notice" style={{ marginTop: "0.85rem" }}>
                {captionNote}
              </p>
            ) : null}
            {captureError ? (
              <p className="error" role="alert">
                {captureError}
                {isReachabilityError(captureError) ? (
                  <>
                    {" "}
                    <button className="text-retry" type="button" onClick={() => void refresh()}>
                      {LANDING.app.tryAgain}
                    </button>
                  </>
                ) : null}
              </p>
            ) : null}
            <span className="card__wash card__wash--note" aria-hidden="true"></span>
          </section>

          {captionOpen ? (
            <section id="caption-box" className="card card--peach card--compact" aria-labelledby="caption-heading">
              {witnessNote ? (
                <p className="notice" id="joy-witness-quiet">
                  {witnessNote}
                </p>
              ) : null}
              <label id="caption-heading" className="whisper-label" htmlFor={captionId}>
                {LANDING.app.captionLabel}
              </label>
              <p className="caption-help">{LANDING.app.captionHelp}</p>
              <input
                id={captionId}
                className="whisper"
                type="text"
                maxLength={WHISPER_MAX}
                autoComplete="off"
                placeholder={LANDING.app.captionExamples}
                value={caption}
                onChange={(event) =>
                  setCaption(event.target.value.replace(/[\r\n]+/g, " ").slice(0, WHISPER_MAX))
                }
              />
              <p className="whisper-count">
                {caption.length}/{WHISPER_MAX}
              </p>
            </section>
          ) : null}

          <section className="card card--lime card--compact">
            <button className="btn btn--lime" type="submit" disabled={busy} style={{ width: "100%" }}>
              {busy ? "Saving…" : savedPhoto || phoneStash || opened ? LANDING.app.replace : LANDING.app.save}
            </button>
          </section>
        </form>

        {yoursReady ? (
          <section id="yours-door" className="card card--lime card--compact" aria-label={LANDING.app.yours}>
            <Link className="yours" href="/app/yours">
              {LANDING.app.yours}
            </Link>
            {phoneNote ? (
              <p className="notice" style={{ marginTop: "0.85rem" }}>
                {phoneNote}
              </p>
            ) : null}
          </section>
        ) : null}

        <section className="card card--cream card--compact" aria-labelledby="today-heading">
          <span className="pill">Story</span>
          <h2 id="today-heading">Today’s moment</h2>
          {!savedPhoto && !phoneStash ? (
            <p className="card__body" style={{ marginTop: "0.8rem" }}>
              Nothing saved yet. One photo and one joy, then YOURS.
            </p>
          ) : (
            <div className="moment-list">
              <article className="moment">
                <span className="moment__kind">photo</span>
                <p>{getJoyById(savedPhoto?.joyType ?? selectedJoyId)?.title ?? "A still from today."}</p>
              </article>
            </div>
          )}
        </section>

        <section className="card card--lime card--compact" aria-labelledby="closing-heading">
          <h2 id="closing-heading">{LANDING.footer.somethingGood}</h2>
        </section>
      </main>

      <footer className="site-footer">
        <p>{LANDING.footer.lookingForward}</p>
        <p>
          <a href={`mailto:${LANDING.footer.hello}`}>{LANDING.footer.hello}</a>
        </p>
      </footer>
    </div>
  );
}
