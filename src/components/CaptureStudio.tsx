"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { captionDisposition } from "@/lib/app-capture";
import { readChosenJoy, writeChosenJoy } from "@/lib/chosen-joy";
import { JOY_NEED, explainClientFetchError, isReachabilityError, readJson } from "@/lib/client-fetch";
import { localDay } from "@/lib/day";
import { applyJoyMatchChoice, suggestJoyId } from "@/lib/joy-match";
import { LANDING, PHOTO_MAX_BYTES, WHISPER_MAX, getJoyById, type JoyType } from "@/lib/landing";
import {
  inspectPhotoDate,
  isImageMime,
  isVideoMime,
  looksLikeBorrowedName,
  looksLikeMemeName,
  PHOTO_DATE_MESSAGES,
} from "@/lib/photo";
import {
  HEIC_ASK,
  copyAsJpegFile,
  isHeicLike,
  jpegFileForCameraStill,
  normalizePhotoFile,
  preparePhotoForUpload,
} from "@/lib/prepare-photo";
import {
  openRearCamera,
  prefersLiveCamera,
  stillFromLiveVideo,
} from "@/lib/live-camera";
import { isHorrificFilename, SAFETY_REFUSAL } from "@/lib/safety-text";
import {
  clearCaptureStashIfOpened,
  clearPendingPhoto,
  readCaptureStash,
  readPendingPhoto,
  stashPhotoFile,
  updateCaptureStashPhoto,
  writeCaptureStash,
  writePendingPhoto,
} from "@/lib/capture-stash";
import type { SessionState } from "@/lib/types";

async function stillFromVideo(file: File): Promise<File> {
  const url = URL.createObjectURL(file);
  try {
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "metadata";
    video.src = url;
    await new Promise<void>((resolve, reject) => {
      const fail = () => reject(new Error("Could not read that video."));
      video.onloadeddata = () => resolve();
      video.onerror = fail;
      window.setTimeout(fail, 8000);
    });
    if (video.readyState < 2) {
      await new Promise<void>((resolve) => {
        video.onseeked = () => resolve();
        video.currentTime = Math.min(0.2, (video.duration || 1) / 4);
        window.setTimeout(() => resolve(), 1200);
      });
    }
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 720;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not keep a still from that video.");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (next) => (next ? resolve(next) : reject(new Error("Could not keep a still from that video."))),
        "image/jpeg",
        0.92,
      );
    });
    const stem = file.name.replace(/\.[^.]+$/, "") || "still";
    return copyAsJpegFile(blob, `${stem}.jpg`, file.lastModified || Date.now());
  } finally {
    URL.revokeObjectURL(url);
  }
}

export default function CaptureStudio() {
  const takeInputId = useId();
  const uploadInputId = useId();
  const captionId = useId();
  const takeInputRef = useRef<HTMLInputElement | null>(null);
  const liveVideoRef = useRef<HTMLVideoElement | null>(null);
  const photoUrlRef = useRef<string | null>(null);
  const photoRef = useRef<File | null>(null);
  const savedPhotoIdRef = useRef<string | null>(null);
  const matchSeq = useRef(0);
  const witnessNoted = useRef(false);
  const witnessedKey = useRef("");
  const [session, setSession] = useState<SessionState | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [selectedJoyId, setSelectedJoyId] = useState<string | null>(null);
  const [captureError, setCaptureError] = useState<string | null>(null);
  const [joyError, setJoyError] = useState<string | null>(null);
  const [dateNote, setDateNote] = useState<string | null>(null);
  const [captionNote, setCaptionNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [liveStream, setLiveStream] = useState<MediaStream | null>(null);
  const [phoneStash, setPhoneStash] = useState(false);
  const [phoneNote, setPhoneNote] = useState<string | null>(null);
  const [pendingReady, setPendingReady] = useState(false);
  const [captionOpen, setCaptionOpen] = useState(false);
  const [mismatch, setMismatch] = useState<{ line: string; suggestedJoyId: string | null } | null>(
    null,
  );
  const [witnessNote, setWitnessNote] = useState<string | null>(null);
  const [captionScroll, setCaptionScroll] = useState(0);
  const [mismatchScroll, setMismatchScroll] = useState(0);

  const day = useMemo(() => localDay(), []);
  const selectedJoy = getJoyById(selectedJoyId);
  const opened = Boolean(session?.yoursOpened);
  const savedPhoto = session?.todayPhoto ?? null;
  const yoursReady = Boolean(savedPhoto) || phoneStash;
  const previewSrc =
    photoUrl || (savedPhoto?.id ? `/api/media/${savedPhoto.id}` : null);

  const refresh = useCallback(async () => {
    try {
      const [sessionRes, stash, pending] = await Promise.all([
        fetch(`/api/session?day=${day}`, { credentials: "same-origin" }),
        readCaptureStash(day),
        readPendingPhoto(day),
      ]);
      const sessionData = await readJson<SessionState>(sessionRes);
      setSession(sessionData);
      savedPhotoIdRef.current = sessionData.todayPhoto?.id ?? null;
      setPendingReady(Boolean(pending));
      if (sessionData.yoursOpened) {
        await clearCaptureStashIfOpened(day, true);
        setPhoneStash(false);
        setPhoneNote(null);
      } else {
        const hasStash = Boolean(stash);
        setPhoneStash(hasStash);
        const phoneOnly = hasStash && !sessionData.todayPhoto;
        setPhoneNote(phoneOnly ? LANDING.app.savedOnPhone : null);
      }
      if (!hydrated && sessionData.todayPhoto && !sessionData.todayPhoto.dateVerified) {
        setDateNote(PHOTO_DATE_MESSAGES.unverified);
      }
      if (!hydrated) {
        const storedId = readChosenJoy(day);
        const savedId = sessionData.todayPhoto?.joyType ?? (sessionData.yoursOpened ? null : stash?.joyType);
        const chosen = getJoyById(storedId || savedId);
        if (chosen) {
          setSelectedJoyId(chosen.id);
          if (!storedId) writeChosenJoy(day, chosen.id);
        }
        const pendingFile = pending && pending.size > 0 ? pending : null;
        if (pendingFile) photoRef.current = pendingFile;
        const joyChanged = Boolean(chosen && savedId && chosen.id !== savedId);
        if (chosen && (pendingFile || joyChanged)) {
          void runJoyMatch(chosen, pendingFile ?? undefined);
        } else if (chosen && (sessionData.todayPhoto || stash)) {
          setCaption(sessionData.todayPhoto?.caption ?? stash?.caption ?? "");
          setCaptionOpen(true);
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
    photoUrlRef.current = photoUrl;
  }, [photoUrl]);

  useEffect(() => {
    return () => {
      const url = photoUrlRef.current;
      if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
    };
  }, []);

  useEffect(() => {
    const video = liveVideoRef.current;
    if (!liveStream || !video) return;
    video.srcObject = liveStream;
    void video.play().catch(() => undefined);
    return () => {
      video.srcObject = null;
    };
  }, [liveStream]);

  useEffect(() => {
    return () => {
      liveStream?.getTracks().forEach((track) => track.stop());
    };
  }, [liveStream]);

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

  function stopLiveCamera() {
    liveStream?.getTracks().forEach((track) => track.stop());
    setLiveStream(null);
  }

  async function openTakeCamera() {
    if (prefersLiveCamera()) {
      try {
        const stream = await openRearCamera();
        setLiveStream(stream);
        return;
      } catch {
        // File input + capture=environment is the Android/desktop fallback.
      }
    }
    takeInputRef.current?.click();
  }

  async function keepLiveStill() {
    const video = liveVideoRef.current;
    if (!video) return;
    try {
      const file = await stillFromLiveVideo(video);
      stopLiveCamera();
      await takePhoto(file, true);
    } catch (error) {
      stopLiveCamera();
      setCaptureError(
        error instanceof Error ? error.message : "Could not keep a still from the camera.",
      );
    }
  }

  async function takePhoto(file: File | null, fromCamera = false) {
    if (!file) return;
    setCaptureError(null);
    let next = file;
    if (isVideoMime(file.type) || /\.(mp4|mov|webm|m4v)$/i.test(file.name)) {
      try {
        next = await stillFromVideo(file);
        setDateNote("Videos aren't saved. We kept one still frame.");
      } catch (error) {
        setCaptureError(
          error instanceof Error ? error.message : "Videos aren't saved. Extract one still frame and try again.",
        );
        return;
      }
    } else {
      try {
        next = fromCamera ? await jpegFileForCameraStill(next) : await normalizePhotoFile(next);
      } catch (error) {
        setCaptureError(error instanceof Error ? error.message : "Choose a photo — a still from the day.");
        return;
      }
      if (isHeicLike(next)) {
        setCaptureError(HEIC_ASK);
        return;
      }
      if (!isImageMime(next.type) && !next.type.startsWith("image/")) {
        setCaptureError("Choose a photo — a still from the day.");
        return;
      }
    }
    if (looksLikeMemeName(next.name)) {
      setCaptureError("Tonight is for your own moment, not a meme.");
      return;
    }
    if (looksLikeBorrowedName(next.name)) {
      setCaptureError("Tonight is for your own moment — not someone else's picture.");
      return;
    }
    if (isHorrificFilename(next.name)) {
      setCaptureError(SAFETY_REFUSAL);
      return;
    }
    let originalBytes: ArrayBuffer | undefined;
    try {
      originalBytes = await next.arrayBuffer();
    } catch {
      originalBytes = undefined;
    }
    const date = inspectPhotoDate({
      bytes: originalBytes,
      lastModified: next.lastModified,
      localDay: day,
      tzOffsetMinutes: new Date().getTimezoneOffset(),
    });
    if (date.takenDay && date.takenDay !== day) {
      setCaptureError(PHOTO_DATE_MESSAGES.old);
      return;
    }
    try {
      next = await preparePhotoForUpload(next);
    } catch (error) {
      setCaptureError(error instanceof Error ? error.message : LANDING.app.tooLarge);
      return;
    }
    if (next.size > PHOTO_MAX_BYTES) {
      setCaptureError(LANDING.app.tooLargeKeep);
      return;
    }
    if (!date.verified) {
      setDateNote(date.reason === "none" ? PHOTO_DATE_MESSAGES.missing : PHOTO_DATE_MESSAGES.unverified);
    } else if (!dateNote?.startsWith("Videos")) {
      setDateNote(null);
    }
    setPhoto(next);
    setPhotoUrl((current) => {
      if (current?.startsWith("blob:")) URL.revokeObjectURL(current);
      return URL.createObjectURL(next);
    });
    photoRef.current = next;
    try {
      await writePendingPhoto(day, next);
      setPendingReady(true);
    } catch {
      setPendingReady(true);
    }
    void updateCaptureStashPhoto(day, next).then((updated) => {
      if (updated) setPhoneStash(true);
    });
    const joy = getJoyById(readChosenJoy(day) ?? selectedJoyId);
    if (joy) {
      witnessedKey.current = "";
      void runJoyMatch(joy, next);
    } else {
      setJoyError(JOY_NEED);
    }
  }

  function revealCaption() {
    setMismatch(null);
    setJoyError(null);
    setCaptionOpen(true);
    setCaptionScroll((n) => n + 1);
  }

  function noteWitnessQuiet(note: string) {
    if (witnessNoted.current) return;
    witnessNoted.current = true;
    setWitnessNote(note);
  }

  async function photoForMatch(fileOverride?: File): Promise<File | null> {
    const override = fileOverride && fileOverride.size > 0 ? fileOverride : null;
    if (override) {
      photoRef.current = override;
      return override;
    }
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
    const mediaId = savedPhotoIdRef.current ?? savedPhoto?.id;
    if (!mediaId) return null;
    try {
      const res = await fetch(`/api/media/${mediaId}`, { credentials: "same-origin" });
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
    const file = await photoForMatch(fileOverride);
    const key = file ? `${joy.id}:${file.size}:${file.lastModified}` : "";
    if (key && witnessedKey.current === key) return;
    if (key) witnessedKey.current = key;
    const seq = ++matchSeq.current;
    setMismatch(null);
    setSelectedJoyId(joy.id);
    if (!file) return;
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
      if (data.verdict === "NEED_PHOTO") return;
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
    if (next.joyId) {
      setSelectedJoyId(next.joyId);
      writeChosenJoy(day, next.joyId);
      witnessedKey.current = `${next.joyId}:choice`;
    }
    revealCaption();
  }

  async function saveMoment(event: FormEvent) {
    event.preventDefault();
    const joy = getJoyById(selectedJoyId) ?? getJoyById(readChosenJoy(day));
    const pending = await readPendingPhoto(day);
    const existingStash = await readCaptureStash(day);
    const uploadPhoto =
      (photoRef.current && photoRef.current.size > 0 ? photoRef.current : null) ??
      (pending && pending.size > 0 ? pending : null) ??
      (existingStash ? stashPhotoFile(existingStash) : null);
    if (!uploadPhoto && !savedPhoto) {
      setCaptureError(LANDING.app.photoNeed);
      return;
    }
    if (!joy) {
      setJoyError(JOY_NEED);
      setCaptureError(null);
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
      form.set("joyType", joy.id);
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
      if (!data.session) throw new Error("Could not save that moment.");
      if (uploadPhoto) {
        try {
          await writeCaptureStash({
            day,
            joyType: joy.id,
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
      writeChosenJoy(day, joy.id);
      setSelectedJoyId(joy.id);
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
      setPhoneNote(latest.todayPhoto ? null : LANDING.app.savedOnPhone);
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

  function recoverPreview() {
    if (!photo) return;
    const reader = new FileReader();
    reader.onload = () => {
      setPhotoUrl((current) => {
        if (current?.startsWith("blob:")) URL.revokeObjectURL(current);
        return String(reader.result);
      });
    };
    reader.readAsDataURL(photo);
  }

  return (
    <div className="page">
      <header className="site-header">
        <Link className="badge" href="/">
          {LANDING.app.brand}
        </Link>
      </header>

      <main id="main">
        <section className="card card--mint card--compact" aria-labelledby="app-moment-heading">
          <h1 id="app-moment-heading">{LANDING.app.heading}</h1>
        </section>

        <form onSubmit={saveMoment}>
        <section className="card card--dark" aria-labelledby="capture-heading">
            <span className="pill">Photo</span>
            <h2 id="capture-heading" className="visually-hidden">
              Add a photo
            </h2>
            <p className="cta-copy" style={{ marginTop: 0 }}>
              {LANDING.app.photoHelp}
            </p>
            <div className="studio">
              <div className="studio-photo-actions">
                <button
                  className="btn btn--ghost"
                  type="button"
                  onClick={() => {
                    void openTakeCamera();
                  }}
                >
                  {LANDING.app.takePhoto}
                </button>
                <input
                  id={takeInputId}
                  ref={takeInputRef}
                  className="visually-hidden"
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(event) => {
                    void takePhoto(event.target.files?.[0] ?? null, true);
                    event.target.value = "";
                  }}
                />
                <label className="btn btn--ghost" htmlFor={uploadInputId}>
                  {LANDING.app.uploadPhoto}
                </label>
                <input
                  id={uploadInputId}
                  className="visually-hidden"
                  type="file"
                  accept="image/*,video/*"
                  onChange={(event) => {
                    void takePhoto(event.target.files?.[0] ?? null);
                    event.target.value = "";
                  }}
                />
              </div>
              {liveStream ? (
                <div className="live-camera">
                  <video
                    ref={liveVideoRef}
                    className="live-camera__video"
                    playsInline
                    muted
                    autoPlay
                  />
                  <div className="live-camera__actions">
                    <button className="btn btn--lime" type="button" onClick={() => void keepLiveStill()}>
                      {LANDING.app.keepStill}
                    </button>
                    <button className="btn btn--ghost" type="button" onClick={stopLiveCamera}>
                      {LANDING.app.cancelCamera}
                    </button>
                  </div>
                </div>
              ) : null}
              {previewSrc ? (
                // User-selected blob preview — next/image cannot optimize object URLs.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={previewSrc}
                  className="photo-preview"
                  src={previewSrc}
                  alt="Selected moment from today"
                  onError={recoverPreview}
                />
              ) : null}
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
            </div>
            {dateNote ? (
              <p className="notice" style={{ marginTop: "0.85rem", color: "#d4ff00" }}>
                {dateNote}
              </p>
            ) : null}
            {captureError ? (
              <p className="error" role="alert">
                {captureError}
                {isReachabilityError(captureError) ? (
                  <>
                    {" "}
                    <button
                      className="text-retry"
                      type="button"
                      onClick={() => {
                        void refresh();
                      }}
                    >
                      {LANDING.app.tryAgain}
                    </button>
                  </>
                ) : null}
              </p>
            ) : null}
            {phoneNote ? (
              <p className="notice" style={{ marginTop: "0.85rem", color: "#d4ff00" }}>
                {phoneNote}
              </p>
            ) : null}
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

          {joyError ? (
            <section className="card card--cream card--compact">
              <p className="error" role="alert" id="joy-need">
                {joyError}{" "}
                <Link href="/app/joy">{LANDING.app.nextJoy}</Link>
              </p>
            </section>
          ) : null}
          {captionNote ? (
            <p className="notice" style={{ marginTop: "0.85rem" }}>
              {captionNote}
            </p>
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
