"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { explainClientFetchError, readJson, readResponsePayload } from "@/lib/client-fetch";
import {
  buildAppCaptureForm,
  clearCaptureStash,
  clearPendingPhoto,
  isYoursMissingPayload,
  readCaptureStash,
} from "@/lib/capture-stash";
import {
  composeKeepCardJpeg,
  keepCardFilename,
  keepCardPhotoSrc,
  loadKeepCardPhoto,
  shareOrDownloadKeepCard,
} from "@/lib/keep-card";
import { localDay } from "@/lib/day";
import { LANDING } from "@/lib/landing";
import {
  STORY_OPENING_INTERVAL_MS,
  STORY_OPENING_LINES,
  nextStoryOpeningIndex,
} from "@/lib/story-opening";
import type { CaptureRecord, StoryRecord } from "@/lib/types";
import { useReportAppProgress } from "@/components/journey-gate";
import { WeaveBubbles } from "@/components/WeaveBubbles";

function PlayIcon() {
  return (
    <svg className="btn__icon" viewBox="0 0 24 24" aria-hidden="true">
      <polygon points="8 5 19 12 8 19" fill="currentColor" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg className="btn__icon" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor" />
      <rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor" />
    </svg>
  );
}

export function StoryOpeningStatus() {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (index >= STORY_OPENING_LINES.length - 1) return;
    const id = window.setTimeout(() => {
      setIndex((current) => nextStoryOpeningIndex(current));
    }, STORY_OPENING_INTERVAL_MS);
    return () => window.clearTimeout(id);
  }, [index]);
  return (
    <section
      className="card card--lavender card--compact story-opening"
      data-line={index}
      aria-live="polite"
    >
      <div className="story-opening__stack">
        <WeaveBubbles />
        <p className="card__body story-opening__line" role="status">
          {STORY_OPENING_LINES[index]}
        </p>
      </div>
    </section>
  );
}

function ShareIcon() {
  return (
    <svg className="btn__icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="18" cy="5" r="2.2" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="6" cy="12" r="2.2" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="18" cy="19" r="2.2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8.4 10.8 15.6 6.6M8.4 13.2 15.6 17.4" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

type EarlierStory = { id: string; day: string; createdAt: string; captureId?: string | null };

type YoursState =
  | { status: "loading" }
  | { status: "keeping" }
  | { status: "expired"; message: string }
  | { status: "missing"; message: string }
  | { status: "blocked"; message: string }
  | { status: "error"; message: string }
  | { status: "ready"; story: StoryRecord; photoId?: string; earlier: EarlierStory[] };

type WeaveResult =
  | { status: "ready"; story: StoryRecord; photoId?: string; earlier?: EarlierStory[] }
  | { status: "missing"; message: string }
  | { status: "expired"; message: string }
  | { status: "blocked"; message: string };

export default function YoursStory() {
  const [state, setState] = useState<YoursState>({ status: "loading" });
  const [playing, setPlaying] = useState(false);
  const [keepBusy, setKeepBusy] = useState(false);
  const [keepNote, setKeepNote] = useState<string | null>(null);
  const [cardError, setCardError] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const cardBlobRef = useRef<Blob | null>(null);
  const day = localDay();
  const searchParams = useSearchParams();
  const requestedStory = searchParams.get("story") || "";
  const requestedMoment = searchParams.get("moment") || "";
  const readyStoryId = state.status === "ready" ? state.story.id : "";
  const readyBody = state.status === "ready" ? state.story.body : "";
  const readyPhotoId =
    state.status === "ready" ? (state.photoId ?? state.story.captureIds[0] ?? "") : "";
  useReportAppProgress(state.status === "ready" ? "weaved" : "turn");

  const weaveYours = useCallback(async (): Promise<WeaveResult> => {
    const open = await fetch("/api/yours", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ day, momentId: requestedMoment || undefined }),
      credentials: "same-origin",
    });
    const data = await readResponsePayload<{
      story?: StoryRecord;
      photo?: CaptureRecord | null;
      earlier?: EarlierStory[];
      error?: string;
      code?: string;
    }>(open);
    if (open.status === 403 && data.code === "blocked") {
      return { status: "blocked", message: data.error || LANDING.app.blocked };
    }
    if (isYoursMissingPayload(open.status, data)) {
      return { status: "missing", message: data.error || LANDING.app.yoursMissing };
    }
    if (open.status === 404) {
      return {
        status: data.code === "missing" ? "missing" : "expired",
        message: data.error || "Tonight's story lived for one night.",
      };
    }
    if (!open.ok || !data.story) {
      throw new Error(data.error || "Could not open tonight's story.");
    }
    return {
      status: "ready",
      story: data.story,
      photoId: data.photo?.id ?? data.story.captureIds[0],
      earlier: data.earlier ?? [],
    };
  }, [day, requestedMoment]);

  const restoreFromStashAndWeave = useCallback(async (): Promise<YoursState> => {
    try {
      const stash = await readCaptureStash(day);
      if (!stash) {
        return { status: "missing", message: LANDING.app.yoursMissing };
      }
      const form = buildAppCaptureForm(stash, new Date().getTimezoneOffset());
      const saveRes = await fetch("/api/captures", {
        method: "POST",
        body: form,
        credentials: "same-origin",
      });
      await readJson(saveRes);
      try {
        await clearPendingPhoto();
      } catch {
        return { status: "error", message: "Could not clear the waiting photo." };
      }
      const woven = await weaveYours();
      if (woven.status === "ready") {
        await clearCaptureStash();
        return {
          status: "ready",
          story: woven.story,
          photoId: woven.photoId,
          earlier: woven.earlier ?? [],
        };
      }
      if (woven.status === "missing") {
        return { status: "error", message: LANDING.app.resaveFailed };
      }
      return woven;
    } catch (error) {
      return {
        status: "error",
        message: explainClientFetchError(error) || LANDING.app.resaveFailed,
      };
    }
  }, [day, weaveYours]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [res, stash] = await Promise.all([
        fetch(
          `/api/yours?day=${encodeURIComponent(day)}&story=${encodeURIComponent(requestedStory)}&moment=${encodeURIComponent(requestedMoment)}`,
          { credentials: "same-origin" },
        ),
        readCaptureStash(day),
      ]);
      const data = await readResponsePayload<{
        story?: StoryRecord | null;
        photo?: CaptureRecord | null;
        opened?: boolean;
        earlier?: EarlierStory[];
        error?: string;
        code?: string;
      }>(res);
      if (cancelled) return;

      const apply = (next: YoursState) => {
        if (!cancelled) setState(next);
      };

      if (res.status === 404 || isYoursMissingPayload(res.status, data)) {
        if (isYoursMissingPayload(res.status, data)) {
          if (stash) {
            apply({ status: "keeping" });
            apply(await restoreFromStashAndWeave());
            return;
          }
          apply({
            status: "missing",
            message: data.error || LANDING.app.yoursMissing,
          });
          return;
        }
        apply({
          status: "expired",
          message: data.error || "Tonight's story lived for one night.",
        });
        return;
      }

      if (data.opened && data.story) {
        await clearCaptureStash();
        apply({
          status: "ready",
          story: data.story,
          photoId: data.photo?.id ?? data.story.captureIds[0],
          earlier: data.earlier ?? [],
        });
        return;
      }

      try {
        const woven = await weaveYours();
        if (cancelled) return;
        if (woven.status === "ready") {
          await clearCaptureStash();
          apply({
            status: "ready",
            story: woven.story,
            photoId: woven.photoId,
            earlier: woven.earlier ?? [],
          });
          return;
        }
        if (woven.status === "missing" && stash) {
          apply({ status: "keeping" });
          apply(await restoreFromStashAndWeave());
          return;
        }
        apply(woven);
      } catch (error) {
        apply({
          status: "missing",
          message: explainClientFetchError(error),
        });
      }
    })().catch((error) => {
      if (!cancelled) {
        setState({ status: "missing", message: explainClientFetchError(error) });
      }
    });
    return () => {
      cancelled = true;
      window.speechSynthesis?.cancel();
    };
  }, [day, requestedMoment, requestedStory, restoreFromStashAndWeave, weaveYours]);

  useEffect(() => {
    if (!readyPhotoId) {
      cardBlobRef.current = null;
      setCardError(Boolean(readyStoryId));
      return;
    }
    let cancelled = false;
    setCardError(false);
    (async () => {
      try {
        const photo = await loadKeepCardPhoto(keepCardPhotoSrc(readyPhotoId, readyStoryId));
        const blob = await composeKeepCardJpeg({ photo, story: readyBody });
        if (cancelled) return;
        cardBlobRef.current = blob;
      } catch {
        if (!cancelled) {
          cardBlobRef.current = null;
          setCardError(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [readyBody, readyPhotoId, readyStoryId]);

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
    const spoken = record.title ? `${record.title}. ${record.body}` : record.body;
    const utterance = new SpeechSynthesisUtterance(spoken);
    utterance.rate = 0.82;
    utterance.pitch = 0.88;
    utterance.onend = () => setPlaying(false);
    setPlaying(true);
    window.speechSynthesis?.speak(utterance);
  }

  async function keepTonight() {
    if (state.status !== "ready" || keepBusy) return;
    const photoId = state.photoId ?? state.story.captureIds[0];
    if (!photoId) {
      setKeepNote(LANDING.app.keepFailed);
      return;
    }
    setKeepBusy(true);
    setKeepNote(null);
    try {
      let blob = cardBlobRef.current;
      if (!blob) {
        const photo = await loadKeepCardPhoto(keepCardPhotoSrc(photoId, state.story.id));
        blob = await composeKeepCardJpeg({ photo, story: state.story.body });
        cardBlobRef.current = blob;
      }
      const result = await shareOrDownloadKeepCard({
        blob,
        filename: keepCardFilename(day),
        title: LANDING.app.yours,
      });
      if (result === "cancelled") return;
    } catch (error) {
      setKeepNote(error instanceof Error ? error.message : LANDING.app.keepFailed);
    } finally {
      setKeepBusy(false);
    }
  }

  const failed = state.status === "expired" || state.status === "missing" || state.status === "blocked" || state.status === "error";

  return (
    <div className="page">
      <header className="site-header">
        <Link className="badge" href="/">
          GoodDayNight
        </Link>
        <Link className="header-meta" href="/app">
          Back to today
        </Link>
      </header>
      <main id="main">
        {state.status === "loading" || state.status === "keeping" ? <StoryOpeningStatus /> : null}
        {failed ? (
          <section className="card card--cream card--compact" aria-labelledby="yours-gone">
            <h1 id="yours-gone">
              {state.status === "expired"
                ? "That night has passed."
                : state.status === "blocked"
                  ? "Can’t create your story tonight."
                  : state.status === "error"
                    ? "Couldn’t keep this moment."
                    : "Not yet."}
            </h1>
            <p className="card__body" style={{ marginTop: "0.8rem" }}>
              {state.message}
            </p>
            <p style={{ marginTop: "1rem" }}>
              <Link className="btn btn--lime" href="/app">
                One good moment today
              </Link>
            </p>
          </section>
        ) : null}
        {state.status === "ready" ? (
          <div className="weaved-finale">
            <div className="weaved-bubbles" aria-hidden="true">
              <WeaveBubbles />
            </div>
            <section id="yours" className="card card--lavender card--compact" aria-labelledby="yours-heading">
            <h1 id="yours-heading" className="step-heading step-heading--navy">
              {LANDING.app.yours}
            </h1>
            {readyPhotoId ? (
              <img
                className="keep-card-view"
                src={keepCardPhotoSrc(readyPhotoId, state.story.id)}
                alt="Tonight’s moment"
              />
            ) : null}
            {state.story.title ? <p className="weaved-label">{state.story.title}</p> : null}
            <p className="card__body weaved-story">{state.story.body}</p>
            {cardError ? (
              <p className="notice" role="status">
                {LANDING.app.keepFailed}
              </p>
            ) : null}
            <div className="actions">
              <button
                className="btn btn--icon"
                type="button"
                aria-label={playing ? LANDING.app.pause : LANDING.app.playMoment}
                onClick={() => {
                  if (playing) {
                    window.speechSynthesis?.cancel();
                    audioRef.current?.pause();
                    setPlaying(false);
                    return;
                  }
                  speakStory(state.story);
                }}
              >
                {playing ? <PauseIcon /> : <PlayIcon />}
                {playing ? LANDING.app.pause : LANDING.app.playMoment}
              </button>
              <button
                className="btn btn--keep btn--icon"
                type="button"
                aria-label={LANDING.app.keepLabel}
                aria-busy={keepBusy}
                disabled={keepBusy || !(state.photoId ?? state.story.captureIds[0])}
                onClick={() => {
                  void keepTonight();
                }}
              >
                <ShareIcon />
                {keepBusy ? LANDING.app.keepBusy : LANDING.app.keep}
              </button>
              {keepNote ? (
                <p className="notice" role="status">
                  {keepNote}
                </p>
              ) : null}
            </div>
            {state.earlier.length ? (
              <nav id="earlier-stories" className="earlier-stories" aria-label="Earlier stories">
                <h2>Earlier stories</h2>
                <ul>
                  {state.earlier.map((item) => (
                    <li key={item.id}>
                      <Link href={`/app/yours?story=${item.id}`}>{item.day}</Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ) : null}
            </section>
          </div>
        ) : null}
      </main>
    </div>
  );
}
