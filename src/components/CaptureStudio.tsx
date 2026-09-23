"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { localDay } from "@/lib/day";
import { LANDING, PHOTO_MAX_BYTES } from "@/lib/landing";
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
  explainClientFetchError,
  isReachabilityError,
  readJson,
} from "@/lib/client-fetch";
import {
  openRearCamera,
  prefersLiveCamera,
  stillFromLiveVideo,
} from "@/lib/live-camera";
import { isHorrificFilename, SAFETY_REFUSAL } from "@/lib/safety-text";
import {
  clearCaptureStashIfOpened,
  readCaptureStash,
  readPendingPhoto,
  updateCaptureStashPhoto,
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
  const takeInputRef = useRef<HTMLInputElement | null>(null);
  const liveVideoRef = useRef<HTMLVideoElement | null>(null);
  const photoUrlRef = useRef<string | null>(null);
  const [session, setSession] = useState<SessionState | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [captureError, setCaptureError] = useState<string | null>(null);
  const [dateNote, setDateNote] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [liveStream, setLiveStream] = useState<MediaStream | null>(null);
  const [phoneStash, setPhoneStash] = useState(false);
  const [phoneNote, setPhoneNote] = useState<string | null>(null);
  const [pendingReady, setPendingReady] = useState(false);

  const day = useMemo(() => localDay(), []);
  const savedPhoto = session?.todayPhoto ?? null;
  const yoursReady = Boolean(savedPhoto) || phoneStash;
  const photoReady = Boolean(photo || pendingReady || phoneStash || savedPhoto);
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
    try {
      await writePendingPhoto(day, next);
      setPendingReady(true);
    } catch {
      setPendingReady(true);
    }
    void updateCaptureStashPhoto(day, next).then((updated) => {
      if (updated) setPhoneStash(true);
    });
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

        {photoReady ? (
          <section id="joy-next" className="card card--lime card--compact">
            <Link className="btn btn--lime" href="/app/joy">
              {LANDING.app.nextJoy}
            </Link>
          </section>
        ) : null}

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
