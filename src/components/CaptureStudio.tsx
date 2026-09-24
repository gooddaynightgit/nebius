"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  FormEvent,
  SyntheticEvent,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { captionDisposition } from "@/lib/app-capture";
import { readChosenJoy, writeChosenJoy } from "@/lib/chosen-joy";
import { JOY_NEED, explainClientFetchError, isReachabilityError, readJson } from "@/lib/client-fetch";
import { localDay } from "@/lib/day";
import { LANDING, PHOTO_MAX_BYTES, WHISPER_MAX, getJoyById } from "@/lib/landing";
import { PRIVACY_NOTE } from "@/lib/privacy";
import { capturePreviewSrc, isCaptureQuestionOpen } from "@/lib/photo-preview";
import {
  applySparkVoice,
  chooseSparkVoice,
  readSparkVoiceMemory,
  writeSparkVoiceMemory,
} from "@/lib/spark-closer";
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
  beginMomentWrite,
  clearCaptureStashIfOpened,
  clearPendingPhoto,
  currentMomentWrite,
  readCaptureStash,
  readPendingMoment,
  readPendingPhoto,
  stashPhotoFile,
  updateCaptureStashPhoto,
  writeCaptureStash,
  writePendingPhoto,
} from "@/lib/capture-stash";
import {
  clearActiveMoment,
  newMomentId,
  readActiveMoment,
  shouldRestorePending,
  writeActiveMoment,
} from "@/lib/moment";
import type { SessionState } from "@/lib/types";
import { useReportAppProgress, useReportBuyerGate } from "@/components/journey-gate";
import { StoryOpeningStatus } from "@/components/YoursStory";
import { destinationForEntitlement, photoButtonsEnabled, releaseCaptureVisit } from "@/lib/photo-entry";
import NoticingMoments from "@/components/NoticingMoments";

type EntitlementLookup = "open" | "closed" | "exhausted" | "error";

async function lookupEntitlement(email: string): Promise<EntitlementLookup> {
  try {
    const res = await fetch("/api/payfast/entitlement", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ email }),
    });
    const data = await readJson<{ remaining?: number; exhausted?: boolean }>(res);
    if ((data.remaining ?? 0) > 0) return "open";
    if (data.exhausted) return "exhausted";
    return "closed";
  } catch {
    return "error";
  }
}

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
  const pathname = usePathname();
  const takeInputId = useId();
  const uploadInputId = useId();
  const captionId = useId();
  const router = useRouter();
  const takeInputRef = useRef<HTMLInputElement | null>(null);
  const liveVideoRef = useRef<HTMLVideoElement | null>(null);
  const photoUrlRef = useRef<string | null>(null);
  const photoRef = useRef<File | null>(null);
  const previewSeq = useRef(0);
  const flowRef = useRef(0);
  const sparkGenRef = useRef(0);
  const savedPhotoIdRef = useRef<string | null>(null);
  const sparkSeq = useRef(0);
  const momentRef = useRef<string | null>(null);
  const [session, setSession] = useState<SessionState | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [selectedJoyId, setSelectedJoyId] = useState<string | null>(null);
  const [captureError, setCaptureError] = useState<string | null>(null);
  const [joyError, setJoyError] = useState<string | null>(null);
  const [dateNote, setDateNote] = useState<string | null>(null);
  const [captionNote, setCaptionNote] = useState<string | null>(null);
  const [turnError, setTurnError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [liveStream, setLiveStream] = useState<MediaStream | null>(null);
  const [phoneStash, setPhoneStash] = useState(false);
  const [phoneNote, setPhoneNote] = useState<string | null>(null);
  const [pendingReady, setPendingReady] = useState(false);
  const [spark, setSpark] = useState<string | null>(null);
  const [sparkPending, setSparkPending] = useState(false);
  const [sparkAnswer, setSparkAnswer] = useState<"yes" | "no" | null>(null);
  const [sparkGeneration, setSparkGeneration] = useState(0);
  const [answeredGeneration, setAnsweredGeneration] = useState<number | null>(null);
  const [captionScroll, setCaptionScroll] = useState(0);

  const [buyerOpen, setBuyerOpen] = useState(true);
  const [resign, setResign] = useState(false);
  const [buyerEmail, setBuyerEmail] = useState("");
  const [buyerCode, setBuyerCode] = useState("");
  const [buyerNote, setBuyerNote] = useState<string | null>(null);
  const [codeBusy, setCodeBusy] = useState(false);
  const [captureOpen, setCaptureOpen] = useState(false);
  const buyerInputRef = useRef<HTMLInputElement | null>(null);
  const buyerId = useId();
  const buyerCodeId = useId();

  const day = useMemo(() => localDay(), []);
  const sessionRef = useRef(session);
  sessionRef.current = session;
  const busyRef = useRef(busy);
  busyRef.current = busy;
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;
  const selectedJoy = getJoyById(selectedJoyId);
  const savedPhoto = session?.todayPhoto ?? null;
  const questionOpen = isCaptureQuestionOpen({
    sparkPending,
    hasSpark: Boolean(spark),
    sparkGeneration,
    answeredGeneration,
  });
  useReportBuyerGate(captureOpen, hydrated);
  useReportAppProgress(busy ? "turn" : questionOpen ? "good" : "upload");
  useEffect(() => {
    if (buyerOpen) buyerInputRef.current?.focus();
  }, [buyerOpen]);

  useEffect(() => {
    if (session?.otpVerified && captureOpen) setBuyerOpen(false);
  }, [session?.otpVerified, captureOpen]);

  function applyEntitlement(result: EntitlementLookup) {
    const signedIn = Boolean(sessionRef.current?.otpVerified && sessionRef.current.email);
    if (photoButtonsEnabled(signedIn, result === "open" ? 1 : 0)) {
      setCaptureOpen(true);
      setBuyerOpen(false);
      return;
    }
    setCaptureOpen(false);
    const next = destinationForEntitlement(result);
    if (next === "/moments") window.location.assign(next);
  }

  useEffect(() => {
    const email = session?.email;
    if (!email || !session?.otpVerified) return;
    let cancel = false;
    void lookupEntitlement(email).then((result) => {
      if (cancel) return;
      applyEntitlement(result);
    });
    return () => {
      cancel = true;
    };
  }, [session?.email, session?.otpVerified]);

  useEffect(() => {
    if (pathname && pathname !== "/app") return;
    function releaseStaleVisit() {
      const released = releaseCaptureVisit(busyRef.current);
      if (released.startNewMoment) {
        momentRef.current = null;
        clearActiveMoment();
      }
      setBusy(released.busy);
      const current = sessionRef.current;
      if (!current?.otpVerified || !current.email) return;
      void lookupEntitlement(current.email).then((result) => {
        if (pathnameRef.current && pathnameRef.current !== "/app") return;
        if (result === "error") return;
        applyEntitlement(result);
      });
    }
    releaseStaleVisit();
    const onPageShow = () => releaseStaleVisit();
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, [pathname]);

  function buyerEmailOk(email: string): boolean {
    return email.length > 3 && email.length < 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  async function sendBuyerCode() {
    const email = buyerEmail.trim().toLowerCase();
    if (!buyerEmailOk(email)) {
      setCaptureOpen(false);
      setBuyerNote("That doesn’t look like an email yet.");
      return;
    }
    setCodeBusy(true);
    setBuyerNote("Sending a code…");
    try {
      const res = await fetch("/api/auth/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ email }),
      });
      const data = await readJson<{ message?: string; error?: string }>(res);
      setBuyerNote(data.message || data.error || "We couldn’t send a code right now.");
    } catch {
      setBuyerNote("We couldn’t send a code right now.");
    } finally {
      setCodeBusy(false);
    }
  }

  async function noteBuyerEmail(event: FormEvent) {
    event.preventDefault();
    const email = buyerEmail.trim().toLowerCase();
    if (!buyerEmailOk(email)) {
      setCaptureOpen(false);
      setBuyerNote("That doesn’t look like an email yet.");
      return;
    }
    if (!/^\d{6}$/.test(buyerCode.trim())) {
      setCaptureOpen(false);
      setBuyerNote("Enter the 6-digit code from your email.");
      return;
    }
    setBuyerNote("Checking…");
    try {
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ email, code: buyerCode.trim(), mode: "buyer" }),
      });
      const data = await readJson<{ ok?: boolean; message?: string; error?: string }>(res);
      if (!res.ok || !data.ok) {
        setCaptureOpen(false);
        setBuyerNote(data.message || data.error || "That code didn’t work. Request a new one.");
        return;
      }
    } catch {
      setCaptureOpen(false);
      setBuyerNote("We couldn’t check that code right now.");
      return;
    }
    try {
      const sessionRes = await fetch(`/api/session?day=${day}`, { credentials: "same-origin" });
      setSession(await readJson<SessionState>(sessionRes));
    } catch {
      // This page can still take a photo. The next save reads the email cookie.
    }
    const result = await lookupEntitlement(email);
    if (result === "open") {
      setCaptureOpen(true);
      setBuyerOpen(false);
      setResign(false);
      setBuyerNote("You’re in. Take or upload today’s moment.");
      return;
    }
    setCaptureOpen(false);
    const next = destinationForEntitlement(result);
    if (next === "/moments") {
      window.location.assign(next);
      return;
    }
    setBuyerNote("Noted. Capture stays closed until this purchase is confirmed.");
  }

  const previewSrc = capturePreviewSrc({
    localPreviewUrl: photoUrl,
    hasLocalPhoto: Boolean(photo),
    savedMediaUrl: null,
  });
  const canPickPhoto = captureOpen;

  const refresh = useCallback(async () => {
    const flowAtStart = flowRef.current;
    try {
      const [sessionRes, stash, pendingMoment] = await Promise.all([
        fetch(`/api/session?day=${day}`, { credentials: "same-origin" }),
        readCaptureStash(day),
        readPendingMoment(day),
      ]);
      const sessionData = await readJson<SessionState>(sessionRes);
      if (flowRef.current !== flowAtStart) {
        setHydrated(true);
        return;
      }
      setSession(sessionData);
      savedPhotoIdRef.current = sessionData.todayPhoto?.id ?? null;
      setPendingReady(Boolean(pendingMoment));
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
      if (!hydrated) {
        const storedId = readChosenJoy(day);
        const savedId = sessionData.todayPhoto?.joyType ?? (sessionData.yoursOpened ? null : stash?.joyType);
        const chosen = getJoyById(storedId || savedId);
        if (chosen) {
          setSelectedJoyId(chosen.id);
          if (!storedId) writeChosenJoy(day, chosen.id);
        }
        const pendingFile = pendingMoment?.file && pendingMoment.file.size > 0 ? pendingMoment.file : null;
        const activeMomentId = readActiveMoment(day);
        const restorePending = shouldRestorePending({
          hasSavedMoment: Boolean(sessionData.hasSavedMoment),
          hasPending: Boolean(pendingFile),
          pendingMomentId: pendingMoment?.momentId ?? null,
          activeMomentId,
        });
        if (restorePending && pendingFile) {
          const momentId = pendingMoment?.momentId || activeMomentId || newMomentId();
          momentRef.current = momentId;
          writeActiveMoment(day, momentId);
          showLocalPhoto(pendingFile);
          if (chosen) void runPhotoSpark(pendingFile);
        } else if (sessionData.todayPhoto?.dateVerified && !sessionData.hasSavedMoment) {
          setDateNote(PHOTO_DATE_MESSAGES.today);
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
    const url = photoUrl;
    return () => {
      if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
    };
  }, [photoUrl]);

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
    if (!captionScroll || !questionOpen) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const frame = window.requestAnimationFrame(() => {
      document.getElementById("caption-box")?.scrollIntoView({
        behavior: reduce ? "auto" : "smooth",
        block: "start",
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [captionScroll, questionOpen]);

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
    if (!file || !canPickPhoto) return;
    const momentId = momentRef.current ?? newMomentId();
    momentRef.current = momentId;
    writeActiveMoment(day, momentId);
    const generation = beginMomentWrite(momentId);
    const stillThisPick = () => {
      const current = currentMomentWrite();
      return current.momentId === momentId && current.generation === generation;
    };
    setCaptureError(null);
    let next = file;
    let keptVideoStill = false;
    if (isVideoMime(file.type) || /\.(mp4|mov|webm|m4v)$/i.test(file.name)) {
      try {
        next = await stillFromVideo(file);
        keptVideoStill = true;
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
    if (date.verified && date.takenDay && date.takenDay !== day) {
      setCaptureError(PHOTO_DATE_MESSAGES.old);
      return;
    }
    try {
      next = await preparePhotoForUpload(next);
    } catch (error) {
      setCaptureError(error instanceof Error ? error.message : LANDING.app.tooLarge);
      return;
    }
    if (!stillThisPick()) return;
    if (next.size > PHOTO_MAX_BYTES) {
      setCaptureError(LANDING.app.tooLargeKeep);
      return;
    }
    if (date.verified && date.takenDay === day) {
      setDateNote(PHOTO_DATE_MESSAGES.today);
    } else if (!keptVideoStill) {
      setDateNote(null);
    }
    if (!stillThisPick()) return;
    showLocalPhoto(next);
    try {
      const written = await writePendingPhoto(day, next, { momentId, generation });
      setPendingReady(Boolean(written) || pendingReady);
    } catch {
      setCaptureError("Could not keep that photo on this phone.");
      return;
    }
    if (!stillThisPick()) return;
    void updateCaptureStashPhoto(day, next, momentId).then((updated) => {
      if (updated && stillThisPick()) setPhoneStash(true);
    });
    const joy = getJoyById(readChosenJoy(day) ?? selectedJoyId);
    if (joy) {
      void runPhotoSpark(next);
    } else {
      setSparkPending(false);
      setJoyError(JOY_NEED);
    }
  }

  function showLocalPhoto(next: File) {
    photoRef.current = next;
    previewSeq.current += 1;
    sparkSeq.current += 1;
    flowRef.current += 1;
    sparkGenRef.current += 1;
    const nextUrl = URL.createObjectURL(next);
    photoUrlRef.current = nextUrl;
    setPhoto(next);
    setPhotoUrl(nextUrl);
    setSpark(null);
    setSparkPending(true);
    setSparkAnswer(null);
    setSparkGeneration(sparkGenRef.current);
    setAnsweredGeneration(null);
    setCaption("");
  }

  function finishSpark(line: string) {
    const voice = chooseSparkVoice(readSparkVoiceMemory());
    writeSparkVoiceMemory(voice);
    setSpark(applySparkVoice(line, voice));
    setSparkPending(false);
    setSparkAnswer(null);
    setAnsweredGeneration(null);
  }

  function chooseSpark(answer: "yes" | "no") {
    setJoyError(null);
    setSparkAnswer(answer);
    setAnsweredGeneration(sparkGenRef.current);
    setCaption("");
    setCaptionScroll((n) => n + 1);
  }

  async function runPhotoSpark(file: File) {
    const seq = ++sparkSeq.current;
    setSpark(null);
    setSparkPending(true);
    setSparkAnswer(null);
    setAnsweredGeneration(null);
    try {
      const previous = readSparkVoiceMemory();
      const form = new FormData();
      form.set("file", file, file.name || "moment.jpg");
      if (previous) {
        form.set("openerIndex", String(previous.openerIndex));
        form.set("closerIndex", String(previous.closerIndex));
      }
      const res = await fetch("/api/photo-spark", {
        method: "POST",
        body: form,
        credentials: "same-origin",
      });
      const data = await readJson<{
        spark?: string;
        blocked?: boolean;
        openerIndex?: number;
        closerIndex?: number;
      }>(res);
      if (seq !== sparkSeq.current) return;
      if (data.blocked) {
        setSpark(data.spark?.trim() || LANDING.app.blocked);
        setSparkPending(false);
        setSparkAnswer(null);
        setAnsweredGeneration(null);
        return;
      }
      if (typeof data.openerIndex === "number" && typeof data.closerIndex === "number") {
        writeSparkVoiceMemory({ openerIndex: data.openerIndex, closerIndex: data.closerIndex });
      }
      const spark = data.spark?.trim();
      if (spark) {
        setSpark(spark);
        setSparkPending(false);
        setSparkAnswer(null);
        setAnsweredGeneration(null);
        return;
      }
      finishSpark("this still from the day");
    } catch (err) {
      if (seq !== sparkSeq.current) return;
      const message = err instanceof Error ? err.message : "";
      if (/verify your email/i.test(message)) {
        setSparkPending(false);
        setCaptureError(message);
        return;
      }
      finishSpark("this still from the day");
    }
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
    if (!sparkAnswer) return;
    const kept = captionDisposition(caption);
    if (!kept.caption) return;
    setBusy(true);
    setCaptureError(null);
    setJoyError(null);
    setTurnError(null);
    setCaptionNote(kept.dropped ? LANDING.app.captionDropped : null);
    if (kept.dropped) setCaption("");
    let turned = false;
    try {
      const form = new FormData();
      form.set("source", "app");
      form.set("kind", "photo");
      form.set("day", day);
      form.set("joyType", joy.id);
      form.set("tzOffset", String(new Date().getTimezoneOffset()));
      form.set("caption", kept.caption);
      form.set("sparkAnswer", sparkAnswer);
      form.set("photoEmphasis", "low");
      if (!momentRef.current) {
        momentRef.current = newMomentId();
        writeActiveMoment(day, momentRef.current);
      }
      form.set("momentId", momentRef.current);
      if (spark) form.set("spark", spark);
      if (uploadPhoto) form.set("file", uploadPhoto, uploadPhoto.name || "moment.jpg");
      const res = await fetch("/api/captures", {
        method: "POST",
        body: form,
        credentials: "same-origin",
      });
      const data = await readJson<{
        session?: SessionState;
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
            sparkAnswer,
            photoEmphasis: "low",
            momentId: momentRef.current || undefined,
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
      const momentId = momentRef.current;
      if (!momentId) throw new Error("Couldn't turn that moment into a story. Try again.");
      const open = await fetch("/api/yours", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ day, momentId }),
      });
      const woven = await readJson<{ story?: { id?: string } }>(open);
      if (!woven.story?.id) {
        throw new Error("Couldn't turn that moment into a story. Try again.");
      }
      turned = true;
      clearActiveMoment();
      momentRef.current = null;
      router.push(`/app/yours?moment=${encodeURIComponent(momentId)}`);
    } catch (err) {
      const message = explainClientFetchError(err) || "Couldn't turn that moment into a story. Try again.";
      setCaptureError(message);
      setTurnError(message);
    } finally {
      if (!turned) setBusy(false);
    }
  }

  function recoverPreview(event: SyntheticEvent<HTMLImageElement>) {
    const failed = event.currentTarget.currentSrc || event.currentTarget.src;
    const active = photoUrlRef.current;
    if (active && failed && failed !== active && !failed.endsWith(active)) return;
    const current = photoRef.current;
    if (!current) return;
    const seq = previewSeq.current;
    const reader = new FileReader();
    reader.onload = () => {
      if (seq !== previewSeq.current || photoRef.current !== current) return;
      const dataUrl = String(reader.result || "");
      if (!dataUrl.startsWith("data:")) return;
      photoUrlRef.current = dataUrl;
      setPhotoUrl(dataUrl);
    };
    reader.readAsDataURL(current);
  }

  return (
    <div className="page">
      <header className="site-header">
        <Link className="badge" href="/">
          {LANDING.app.brand}
        </Link>
      </header>

      <main id="main">
        {busy ? <StoryOpeningStatus /> : null}
        {busy ? null : (
        <>
        <section className="card card--mint card--compact" aria-labelledby="app-moment-heading">
          <h1 id="app-moment-heading">{LANDING.app.heading}</h1>
          <NoticingMoments />
          {hydrated && buyerOpen && (!session?.otpVerified || resign) ? (
            <form className="buyer-email" onSubmit={noteBuyerEmail}>
              <label className="whisper-label" htmlFor={buyerId}>
                Email
              </label>
              <input
                id={buyerId}
                ref={buyerInputRef}
                className="whisper"
                type="text"
                inputMode="email"
                autoComplete="email"
                value={buyerEmail}
                onChange={(event) => {
                  setBuyerEmail(event.target.value);
                  setBuyerNote(null);
                }}
              />
              <button className="btn btn--lime" type="button" disabled={codeBusy} onClick={() => void sendBuyerCode()}>
                Email me a code
              </button>
              <label className="whisper-label" htmlFor={buyerCodeId}>
                Code
              </label>
              <input
                id={buyerCodeId}
                className="whisper"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={buyerCode}
                onChange={(event) => {
                  setBuyerCode(event.target.value.replace(/\D/g, "").slice(0, 6));
                  setBuyerNote(null);
                }}
              />
              <button className="btn btn--lime" type="submit">
                Open my moments
              </button>
              <p className="privacy-note">{PRIVACY_NOTE}</p>
            </form>
          ) : null}
          {buyerNote ? (
            <p className="buyer-email__note" role="status">
              {buyerNote}
            </p>
          ) : null}
        </section>

        <form onSubmit={saveMoment}>
        <section className="card card--dark" aria-labelledby="capture-heading">
            <h2 id="capture-heading" className="step-heading step-heading--navy">
              Capture it
            </h2>
            <p className="visually-hidden">Add a photo</p>
            <p className="cta-copy" style={{ marginTop: 0 }}>
              {LANDING.app.photoHelp}
            </p>
            <div className="studio">
              {captureOpen ? (
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
              ) : null}
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
              {spark ? (
                <p id="photo-spark" className="photo-spark" role="status">
                  {spark}
                </p>
              ) : sparkPending ? (
                <p className="photo-spark-wait" role="status" aria-live="polite">
                  {LANDING.app.sparkWait}
                </p>
              ) : null}
              {spark && !sparkPending && !questionOpen ? (
                <div className="spark-choice" role="group" aria-label="Did that match?">
                  <button className="btn btn--lime" type="button" onClick={() => chooseSpark("yes")}>
                    {LANDING.app.sparkYes}
                  </button>
                  <button className="btn btn--ghost" type="button" onClick={() => chooseSpark("no")}>
                    {LANDING.app.sparkNo}
                  </button>
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

          {questionOpen ? (
            <section id="caption-box" className="card card--lavender card--compact" aria-labelledby="caption-heading">
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
                required
                aria-required="true"
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

          {questionOpen ? (
            <section className="card card--aqua card--compact" aria-label="Turn my moment">
              <button
                className="btn btn--turn"
                type="submit"
                disabled={busy || !caption.trim()}
                aria-busy={busy}
              >
                {busy ? "Turning your moment…" : "Turn my moment"}
              </button>
              {turnError ? (
                <p className="error" role="alert">
                  {turnError}
                </p>
              ) : null}
            </section>
          ) : null}
        </form>

        <section className="card card--lime card--compact" aria-labelledby="closing-heading">
          <h2 id="closing-heading">{LANDING.footer.somethingGood}</h2>
        </section>
        </>
        )}
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
