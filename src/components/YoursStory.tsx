"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import StoryPlayback from "@/components/StoryPlayback";
import { explainClientFetchError, readJson, readResponsePayload } from "@/lib/client-fetch";
import {
  buildAppCaptureForm,
  clearCaptureStash,
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
import type { CaptureRecord, StoryRecord } from "@/lib/types";

type YoursState =
  | { status: "loading" }
  | { status: "keeping" }
  | { status: "expired"; message: string }
  | { status: "missing"; message: string }
  | { status: "blocked"; message: string }
  | { status: "error"; message: string }
  | { status: "ready"; story: StoryRecord; photoId?: string };

type WeaveResult =
  | { status: "ready"; story: StoryRecord; photoId?: string }
  | { status: "missing"; message: string }
  | { status: "expired"; message: string }
  | { status: "blocked"; message: string };

export default function YoursStory() {
  const [state, setState] = useState<YoursState>({ status: "loading" });
  const [playing, setPlaying] = useState(false);
  const [keepBusy, setKeepBusy] = useState(false);
  const [keepNote, setKeepNote] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const day = localDay();

  const weaveYours = useCallback(async (): Promise<WeaveResult> => {
    const open = await fetch("/api/yours", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ day }),
      credentials: "same-origin",
    });
    const data = await readResponsePayload<{
      story?: StoryRecord;
      photo?: CaptureRecord | null;
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
    };
  }, [day]);

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
      const woven = await weaveYours();
      if (woven.status === "ready") {
        await clearCaptureStash();
        return { status: "ready", story: woven.story, photoId: woven.photoId };
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
        fetch(`/api/yours?day=${day}`, { credentials: "same-origin" }),
        readCaptureStash(day),
      ]);
      const data = await readResponsePayload<{
        story?: StoryRecord | null;
        photo?: CaptureRecord | null;
        opened?: boolean;
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
        });
        return;
      }

      try {
        const woven = await weaveYours();
        if (cancelled) return;
        if (woven.status === "ready") {
          await clearCaptureStash();
          apply({ status: "ready", story: woven.story, photoId: woven.photoId });
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
  }, [day, restoreFromStashAndWeave, weaveYours]);

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
      const photo = await loadKeepCardPhoto(keepCardPhotoSrc(photoId, state.story.id));
      const blob = await composeKeepCardJpeg({ photo, story: state.story.body });
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
          Gooddaynight
        </Link>
        <Link className="header-meta" href="/app">
          Back to today
        </Link>
      </header>
      <main id="main">
        {state.status === "loading" ? (
          <section className="card card--lavender card--compact">
            <p className="card__body">Opening tonight’s story…</p>
          </section>
        ) : null}
        {state.status === "keeping" ? (
          <section className="card card--lavender card--compact" aria-live="polite">
            <p className="card__body">{LANDING.app.keepingMoment}</p>
          </section>
        ) : null}
        {failed ? (
          <section className="card card--cream card--compact" aria-labelledby="yours-gone">
            <h1 id="yours-gone">
              {state.status === "expired"
                ? "That night has passed."
                : state.status === "blocked"
                  ? "No YOURS story tonight."
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
          <section id="yours" className="card card--lavender card--compact" aria-labelledby="yours-heading">
            <h1 id="yours-heading" className="visually-hidden">
              {LANDING.app.yours}
            </h1>
            <StoryPlayback id="app-story-playback" title="">
              <p className="playback__story">{state.story.body}</p>
            </StoryPlayback>
            <div className="actions" style={{ marginTop: "1rem" }}>
              <button
                className="btn"
                type="button"
                onClick={() => {
                  if (playing) {
                    window.speechSynthesis?.cancel();
                    audioRef.current?.pause();
                    setPlaying(false);
                    return;
                  }
                  speakStory(state.story);
                }}
                style={{ color: "var(--navy)", borderColor: "rgba(22,50,74,0.25)" }}
              >
                {playing ? "Pause" : "Replay last night"}
              </button>
              <button
                className="btn btn--keep"
                type="button"
                aria-label={LANDING.app.keepLabel}
                aria-busy={keepBusy}
                disabled={keepBusy || !(state.photoId ?? state.story.captureIds[0])}
                onClick={() => {
                  void keepTonight();
                }}
              >
                {keepBusy ? LANDING.app.keepBusy : LANDING.app.keep}
              </button>
              {keepNote ? (
                <p className="notice" role="status">
                  {keepNote}
                </p>
              ) : null}
            </div>
            <div className="status-row">
              <span className="chip">
                {state.story.mock
                  ? state.story.weaveModel === "mock-fallback"
                    ? "Couldn’t finish tonight’s close; a quiet stand-in from the photo and joy."
                    : "Written without seeing the photo (add NEBIUS_API_KEY for Kimi)"
                  : state.story.weaveModel}
              </span>
              <span className="chip">
                {state.story.tts.status === "sonic" ? "Sonic voice" : "Browser voice (Sonic coming)"}
              </span>
            </div>
          </section>
        ) : null}
      </main>
    </div>
  );
}
