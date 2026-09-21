"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import StoryPlayback from "@/components/StoryPlayback";
import { explainClientFetchError, readResponsePayload } from "@/lib/client-fetch";
import { localDay } from "@/lib/day";
import { LANDING } from "@/lib/landing";
import type { StoryRecord } from "@/lib/types";

type YoursState =
  | { status: "loading" }
  | { status: "expired"; message: string }
  | { status: "missing"; message: string }
  | { status: "blocked"; message: string }
  | { status: "ready"; story: StoryRecord };

export default function YoursStory() {
  const [state, setState] = useState<YoursState>({ status: "loading" });
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const day = localDay();

  const openYours = useCallback(async () => {
    try {
      const open = await fetch("/api/yours", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ day }),
        credentials: "same-origin",
      });
      const data = await readResponsePayload<{ story?: StoryRecord; error?: string; code?: string }>(
        open,
      );
      if (open.status === 404) {
        setState({
          status: data.code === "missing" ? "missing" : "expired",
          message: data.error || "Tonight's story lived for one night.",
        });
        return;
      }
      if (open.status === 403 && data.code === "blocked") {
        setState({
          status: "blocked",
          message: data.error || LANDING.app.blocked,
        });
        return;
      }
      if (!open.ok || !data.story) {
        throw new Error(data.error || "Could not open tonight's story.");
      }
      setState({ status: "ready", story: data.story });
    } catch (error) {
      setState({
        status: "missing",
        message: explainClientFetchError(error),
      });
    }
  }, [day]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/yours?day=${day}`, { credentials: "same-origin" });
      const data = await readResponsePayload<{
        story?: StoryRecord | null;
        opened?: boolean;
        error?: string;
        code?: string;
      }>(res);
      if (cancelled) return;
      if (res.status === 404) {
        setState({
          status: data.code === "missing" ? "missing" : "expired",
          message: data.error || "Tonight's story lived for one night.",
        });
        return;
      }
      if (data.opened && data.story) {
        setState({ status: "ready", story: data.story });
        return;
      }
      await openYours();
    })().catch((error) => {
      if (!cancelled) {
        setState({ status: "missing", message: explainClientFetchError(error) });
      }
    });
    return () => {
      cancelled = true;
      window.speechSynthesis?.cancel();
    };
  }, [day, openYours]);

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
        {state.status === "expired" || state.status === "missing" || state.status === "blocked" ? (
          <section className="card card--cream card--compact" aria-labelledby="yours-gone">
            <h1 id="yours-gone">
              {state.status === "expired"
                ? "That night has passed."
                : state.status === "blocked"
                  ? "No YOURS story tonight."
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
            </div>
            <div className="status-row">
              <span className="chip">
                {state.story.mock
                  ? state.story.weaveModel === "mock-fallback"
                    ? "Nemotron didn’t finish; a quiet stand-in from the caption and joy."
                    : "Written without seeing the photo (add NEBIUS_API_KEY for Nemotron)"
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
