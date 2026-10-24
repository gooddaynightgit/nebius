"use client";

import Link from "next/link";
import HappyBubble from "@/components/HappyBubble";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import JoyPicker from "@/components/JoyPicker";
import SiteFooter from "@/components/SiteFooter";
import { readCaptureStash } from "@/lib/capture-stash";
import { withClientClock, useLocalDay } from "@/lib/client-day";
import { readJson } from "@/lib/client-fetch";
import { readChosenJoy, writeChosenJoy } from "@/lib/chosen-joy";
import { localDay } from "@/lib/day";
import { journeyNextLabel, restoredJoyId } from "@/lib/journey";
import { useRegisterStepForward } from "@/components/step-forward";
import { LANDING, accordionJoys, getJoyById, type JoyType } from "@/lib/landing";
import { latestMoments, momentListLabel } from "@/lib/latest-moments";
import { keptSavedMoments } from "@/lib/moment-expiry";
import { uploadPhotoDestination } from "@/lib/photo-entry";
import {
  SAVED_JOY_MOMENTS_ID,
  SAVED_JOY_MOMENTS_LABEL,
  chooseStoryJoy,
  openSavedJoyMoments,
} from "@/lib/saved-joy-moments";

export const FEEL_GOOD_VISUAL = "Feel good visual";
export const FEEL_GOOD_VOICE = "Feel good voice";
export const FLIP_IT = "Not feeling it? Flip it";

type SavedMoment = { id: string; day: string; createdAt: string };

function savedDay(story: { day?: string; createdAt: string }): string {
  if (story.day) return story.day;
  const ms = Date.parse(story.createdAt);
  if (Number.isNaN(ms)) return "";
  return localDay(new Date(ms));
}

export default function JoyStudio() {
  const day = useLocalDay();
  const pathname = usePathname();
  const [selectedJoyId, setSelectedJoyId] = useState<string | null>(null);
  const [resetSignal, setResetSignal] = useState(0);
  const [savedMoments, setSavedMoments] = useState<SavedMoment[]>([]);
  const [needsJoyPick, setNeedsJoyPick] = useState(true);
  const [joyMissed, setJoyMissed] = useState(false);
  const [visualOpen, setVisualOpen] = useState(false);
  useEffect(() => {
    if (joyMissed) setVisualOpen(true);
  }, [joyMissed]);
  const reportJoyEmpty = useCallback((empty: boolean) => {
    setNeedsJoyPick(empty);
    if (!empty) setJoyMissed(false);
  }, []);
  const selectedJoy = getJoyById(selectedJoyId) ?? getJoyById(readChosenJoy(day));
  const joys = useMemo(() => {
    const base = accordionJoys();
    if (selectedJoy && !base.some((joy) => joy.id === selectedJoy.id)) {
      return [...base, selectedJoy];
    }
    return base;
  }, [selectedJoy]);

  useLayoutEffect(() => {
    if (pathname && pathname !== "/app/joy") return;
    const stored = restoredJoyId(readChosenJoy(day), null, null);
    if (stored) setSelectedJoyId(stored);
  }, [day, pathname]);

  useEffect(() => {
    if (pathname && pathname !== "/app/joy") return;
    let cancel = false;
    function restoreCatalogJoy() {
      const stored = restoredJoyId(readChosenJoy(day), null, null);
      if (stored) setSelectedJoyId(stored);
      setResetSignal((current) => current + 1);
    }
    restoreCatalogJoy();
    (async () => {
      let stashJoy: string | null = null;
      let photoJoy: string | null = null;
      try {
        stashJoy = (await readCaptureStash(day))?.joyType ?? null;
      } catch {
        stashJoy = null;
      }
      try {
        const res = await fetch(withClientClock(`/api/session?day=${encodeURIComponent(day)}`), {
          credentials: "same-origin",
          cache: "no-store",
        });
        const session = await readJson<{ todayPhoto?: { joyType?: string } | null }>(res);
        photoJoy = session.todayPhoto?.joyType ?? null;
      } catch {
        photoJoy = null;
      }
      if (cancel) return;
      const id = restoredJoyId(readChosenJoy(day), stashJoy, photoJoy);
      if (!id) return;
      setSelectedJoyId(id);
      if (!readChosenJoy(day)) writeChosenJoy(day, id);
    })();
    const onPageShow = () => restoreCatalogJoy();
    window.addEventListener("pageshow", onPageShow);
    return () => {
      cancel = true;
      window.removeEventListener("pageshow", onPageShow);
    };
  }, [day, pathname]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(withClientClock(`/api/yours?day=${encodeURIComponent(day)}`), {
          credentials: "same-origin",
          cache: "no-store",
        });
        const data = await readJson<{
          story?: { id?: string; day?: string; createdAt?: string } | null;
          earlier?: SavedMoment[];
        }>(res);
        if (cancelled) return;
        const current = data.story?.id && data.story.createdAt
          ? [{ id: data.story.id, day: savedDay({ day: data.story.day, createdAt: data.story.createdAt }), createdAt: data.story.createdAt }]
          : [];
        setSavedMoments(latestMoments(keptSavedMoments([...current, ...(data.earlier ?? [])], day)));
      } catch {
        if (!cancelled) setSavedMoments([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [day]);

  useEffect(() => {
    if (!joyMissed || !needsJoyPick || selectedJoy) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.getElementById("joy-need")?.scrollIntoView?.({
      behavior: reduce ? "auto" : "smooth",
      block: "start",
    });
  }, [joyMissed, needsJoyPick, selectedJoy]);

  function pickJoy(joy: JoyType) {
    setJoyMissed(false);
    chooseStoryJoy(joy.id, (joyId) => {
      writeChosenJoy(day, joyId);
      setSelectedJoyId(joyId);
    });
  }

  async function uploadPhoto() {
    const selectedJoy = getJoyById(selectedJoyId) ?? getJoyById(readChosenJoy(day));
    if (!selectedJoy) {
      setJoyMissed(true);
      return;
    }
    setSelectedJoyId(selectedJoy.id);
    setResetSignal((current) => current + 1);
    let signedIn = false;
    let game: number | null = null;
    try {
      const sessionRes = await fetch(withClientClock(`/api/session?day=${encodeURIComponent(day)}`), {
        credentials: "same-origin",
        cache: "no-store",
      });
      const session = await readJson<{ otpVerified?: boolean; email?: string | null }>(sessionRes);
      if (session.otpVerified && session.email) {
        signedIn = true;
        const balanceRes = await fetch("/api/payfast/entitlement", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ email: session.email }),
        });
        const balance = await readJson<{ remaining?: number }>(balanceRes);
        game = balanceRes.ok ? (balance.remaining ?? 0) : null;
      }
    } catch {
      signedIn = false;
    }
    window.location.assign(uploadPhotoDestination(signedIn, game));
  }

  useRegisterStepForward({
    label: journeyNextLabel(2) ?? "Unlock/Capture",
    enabled: true,
    run: () => {
      void uploadPhoto();
    },
  });

  return (
    <div className="page">
      <header className="site-header">
        <Link className="badge" href="/">
          {LANDING.app.brand}
        </Link>
      </header>

      <main id="main">
        <section id="joy-pick" className="card card--cream card--moment" aria-labelledby="joy-heading">
          <h2 id="joy-heading" className="step-heading step-heading--navy feel-good-toggle__heading">
            <button
              type="button"
              className="feel-good-toggle"
              aria-expanded={visualOpen}
              aria-controls="feel-good-visual"
              onClick={() => setVisualOpen((open) => !open)}
            >
              <span>{FEEL_GOOD_VISUAL}</span>
              <span className="feel-good-toggle__hint">Upload or capture a photo</span>
            </button>
          </h2>
          <div id="feel-good-visual" hidden={!visualOpen}>
          {joyMissed && needsJoyPick && !selectedJoy ? (
            <p className="step-nudge step-nudge--block step-nudge--alert" id="joy-need" role="status">
              {LANDING.app.joyNudge}
            </p>
          ) : null}
          <JoyPicker
            name="quiet-joy-app"
            idPrefix="app-joy"
            selectedId={selectedJoyId}
            onSelect={pickJoy}
            joys={joys}
            legend={null}
            resetSignal={resetSignal}
            playbackTitle="Example: My gratitude journal"
            playbackLead={LANDING.app.playbackLead}
            playbackVariant="weaved"
            promptWhenEmpty
            emptyAlert={joyMissed}
            onEmptyChange={reportJoyEmpty}
            trailingChoice={{
              id: SAVED_JOY_MOMENTS_ID,
              title: SAVED_JOY_MOMENTS_LABEL,
              onChoose: () => openSavedJoyMoments((href) => window.location.assign(href)),
            }}
          />
          {savedMoments.length ? (
            <nav
              id="saved-joy-moments-list"
              className="earlier-stories saved-joy-moments"
              aria-label={SAVED_JOY_MOMENTS_LABEL}
            >
              <h3>{SAVED_JOY_MOMENTS_LABEL}</h3>
              <ul>
                {savedMoments.map((item) => (
                  <li key={item.id}>
                    <Link href={`/app/yours?story=${item.id}`}>{momentListLabel(item)}</Link>
                  </li>
                ))}
              </ul>
            </nav>
          ) : null}
          </div>
          <span className="card__wash card__wash--note" aria-hidden="true"></span>
        </section>

        <section className="card card--lavender card--moment" aria-labelledby="voice-heading">
          <h2 id="voice-heading" className="step-heading step-heading--navy feel-good-toggle__heading">
            <span className="feel-good-toggle feel-good-toggle--static">
              <span>{FEEL_GOOD_VOICE}</span>
              <span className="feel-good-toggle__hint">Say it out loud</span>
            </span>
          </h2>
          <div className="feel-good-voice">
            <Link className="step-next feel-good-flip" href="/something-good">
              <span>{FLIP_IT}</span>
              <svg className="step-next__arrow" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M5 12h13M13 6l6 6-6 6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
          </div>
        </section>

        <HappyBubble text={LANDING.footer.somethingGood} />
      </main>

      <SiteFooter />
    </div>
  );
}
