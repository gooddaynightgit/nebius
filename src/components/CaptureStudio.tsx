"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
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
import { reviewCaptureView } from "@/lib/journey";
import { LANDING, PHOTO_MAX_BYTES, WHISPER_MAX, getJoyById } from "@/lib/landing";
import { capturePreviewSrc, isCaptureQuestionOpen } from "@/lib/photo-preview";
import {
  applySparkVoice,
  chooseSparkVoice,
  readSparkVoiceMemory,
  writeSparkVoiceMemory,
} from "@/lib/spark-closer";
import {
  inspectPhotoDate,
  looksLikeBorrowedName,
  looksLikeMemeName,
  PHOTO_DATE_MESSAGES,
} from "@/lib/photo";
import {
  HEIC_ASK,
  isHeicLike,
  jpegFileForCameraStill,
  normalizePhotoFile,
  preparePhotoForUpload,
} from "@/lib/prepare-photo";
import { PHOTO_NOT_A_PICTURE, PHOTO_NOT_CLEAR, blobLooksBlank, isStillImageFile } from "@/lib/photo-picture";
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

export default function CaptureStudio() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const review = searchParams.get("review");
  const takeInputId = useId();
  const uploadInputId = useId();
  const captionId = useId();
  const captionRef = useRef<HTMLInputElement | null>(null);
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
  const [captionMissed, setCaptionMissed] = useState(false);
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

  const [captureOpen, setCaptureOpen] = useState(false);

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
  const reviewView = reviewCaptureView({
    review,
    busy,
    questionOpen,
    hasPhoto: Boolean(photo) || Boolean(savedPhoto),
    hasCaption: caption.trim().length > 0,
  });
  useReportAppProgress(reviewView.progress);

  function applyEntitlement(result: EntitlementLookup) {
    const sessionOpen = Boolean(sessionRef.current?.otpVerified && sessionRef.current.email);
    if (photoButtonsEnabled(sessionOpen, result === "open" ? 1 : 0)) {
      setCaptureOpen(true);
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

  const previewSrc = capturePreviewSrc({
    localPreviewUrl: photoUrl,
    hasLocalPhoto: Boolean(photo),
    savedMediaUrl: null,
  });
  const canPickPhoto = captureOpen;

  const refresh = useCallback(async () => {
    const flowAtStart = flowRef.current;
    const sessionTask = fetch(`/api/session?day=${day}`, { credentials: "same-origin" }).then((res) =>
      readJson<SessionState>(res),
    );
    const localTask = Promise.all([readCaptureStash(day), readPendingMoment(day)]);
    let sessionData: SessionState;
    try {
      sessionData = await sessionTask;
    } catch (error) {
      setHydrated(true);
      setCaptureError(explainClientFetchError(error));
      return;
    }
    if (flowRef.current !== flowAtStart) {
      setHydrated(true);
      return;
    }
    setSession(sessionData);
    savedPhotoIdRef.current = sessionData.todayPhoto?.id ?? null;
    let stash: Awaited<ReturnType<typeof readCaptureStash>>;
    let pendingMoment: Awaited<ReturnType<typeof readPendingMoment>>;
    try {
      [stash, pendingMoment] = await localTask;
    } catch (error) {
      setHydrated(true);
      setCaptureError(explainClientFetchError(error));
      return;
    }
    if (flowRef.current !== flowAtStart) {
      setHydrated(true);
      return;
    }
    try {
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
        if ((review === "good" || review === "weave") && stash?.caption) {
          setCaption(stash.caption);
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
      setHydrated(true);
      setCaptureError(explainClientFetchError(error));
    }
  }, [day, hydrated, review]);

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

  function rejectUnpicture() {
    setDateNote(null);
    setCaptureError(PHOTO_NOT_A_PICTURE);
  }

  async function rejectUnclearPicture() {
    setDateNote(null);
    setSpark(null);
    setSparkPending(false);
    setSparkAnswer(null);
    setPhoto(null);
    photoRef.current = null;
    if (photoUrlRef.current) URL.revokeObjectURL(photoUrlRef.current);
    photoUrlRef.current = null;
    setPhotoUrl(null);
    setCaptureError(PHOTO_NOT_CLEAR);
    try {
      await clearPendingPhoto();
    } catch {
      // The picture is already dropped from the screen.
    }
  }

  async function takePhoto(file: File | null, fromCamera = false) {
    if (!file || !canPickPhoto) return;
    setCaptureError(null);
    if (!isStillImageFile(file)) {
      rejectUnpicture();
      return;
    }
    let next = file;
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
    if (!isStillImageFile(next)) {
      rejectUnpicture();
      return;
    }
    try {
      if (await blobLooksBlank(next)) {
        await rejectUnclearPicture();
        return;
      }
    } catch {
      rejectUnpicture();
      return;
    }
    const momentId = momentRef.current ?? newMomentId();
    momentRef.current = momentId;
    writeActiveMoment(day, momentId);
    const generation = beginMomentWrite(momentId);
    const stillThisPick = () => {
      const current = currentMomentWrite();
      return current.momentId === momentId && current.generation === generation;
    };
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
    } else {
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
      if (
        message === PHOTO_NOT_CLEAR ||
        message === PHOTO_NOT_A_PICTURE ||
        /verify your email/i.test(message)
      ) {
        setSparkPending(false);
        if (message === PHOTO_NOT_CLEAR || message === PHOTO_NOT_A_PICTURE) {
          await rejectUnclearPicture();
        } else {
          setCaptureError(message);
        }
        return;
      }
      finishSpark("this still from the day");
    }
  }

  async function saveMoment(event: FormEvent) {
    event.preventDefault();
    if (!caption.trim()) {
      setCaptionMissed(true);
      const field = captionRef.current;
      field?.focus({ preventScroll: true });
      field?.scrollIntoView({ block: "center", inline: "nearest" });
      return;
    }
    setCaptionMissed(false);
    const kept = captionDisposition(caption);
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
        </section>

        <form onSubmit={saveMoment}>
        <section className="card card--dark" aria-labelledby="capture-heading">
            <h2 id="capture-heading" className="step-heading step-heading--navy">
              Capture your good moment
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
                  accept="image/*"
                  onChange={(event) => {
                    void takePhoto(event.target.files?.[0] ?? null);
                    event.target.value = "";
                  }}
                />
                {captureError === PHOTO_NOT_A_PICTURE || captureError === PHOTO_NOT_CLEAR ? (
                  <p className="capture-reject" role="alert">
                    {captureError}
                  </p>
                ) : null}
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
            {captureError &&
            captureError !== PHOTO_NOT_A_PICTURE &&
            captureError !== PHOTO_NOT_CLEAR ? (
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

          {reviewView.showQuestion ? (
            <section id="caption-box" className="card card--lavender card--compact" aria-labelledby="caption-heading">
              <label id="caption-heading" className="whisper-label" htmlFor={captionId}>
                {LANDING.app.captionLabel}
              </label>
              <p className="caption-help">{LANDING.app.captionHelp}</p>
              <input
                id={captionId}
                ref={captionRef}
                className={captionMissed ? "whisper whisper--alert" : "whisper"}
                type="text"
                maxLength={WHISPER_MAX}
                autoComplete="off"
                placeholder={LANDING.app.captionExamples}
                aria-required="true"
                aria-invalid={captionMissed || undefined}
                aria-describedby={captionMissed ? "caption-need" : undefined}
                value={caption}
                onChange={(event) => {
                  const next = event.target.value.replace(/[\r\n]+/g, " ").slice(0, WHISPER_MAX);
                  setCaption(next);
                  if (next.trim()) setCaptionMissed(false);
                }}
              />
              {captionMissed ? (
                <p className="whisper-nudge" id="caption-need" role="alert">
                  A gentle nudge: type the good in this moment first.
                </p>
              ) : null}
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

          {reviewView.showWeave ? (
            <section className="card card--aqua card--compact" aria-label="Weave my good moment">
              <button
                className="btn btn--turn"
                type="submit"
                disabled={busy}
                aria-busy={busy}
              >
                {busy ? "Weaving your good moment…" : "Weave my good moment"}
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
        <p>
          <Link href="/">{LANDING.footer.site}</Link>
        </p>
      </footer>
    </div>
  );
}
