"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import JoyPicker from "@/components/JoyPicker";
import SiteFooter from "@/components/SiteFooter";
import StepControl from "@/components/StepControl";
import { readCaptureStash } from "@/lib/capture-stash";
import { readJson } from "@/lib/client-fetch";
import { readChosenJoy, writeChosenJoy } from "@/lib/chosen-joy";
import { localDay } from "@/lib/day";
import { restoredJoyId, STEP_LABEL } from "@/lib/journey";
import { LANDING, accordionJoys, getJoyById, type JoyType } from "@/lib/landing";
import { latestMoments, momentListLabel } from "@/lib/latest-moments";
import { uploadPhotoDestination } from "@/lib/photo-entry";
import {
  SAVED_JOY_MOMENTS_ID,
  SAVED_JOY_MOMENTS_LABEL,
  chooseStoryJoy,
  openSavedJoyMoments,
} from "@/lib/saved-joy-moments";

type SavedMoment = { id: string; day: string; createdAt: string };

export default function JoyStudio() {
  const day = useMemo(() => localDay(), []);
  const pathname = usePathname();
  const [selectedJoyId, setSelectedJoyId] = useState<string | null>(null);
  const [resetSignal, setResetSignal] = useState(0);
  const [savedMoments, setSavedMoments] = useState<SavedMoment[]>([]);
  const [needsJoyPick, setNeedsJoyPick] = useState(true);
  const [joyMissed, setJoyMissed] = useState(false);
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
        const res = await fetch(`/api/session?day=${encodeURIComponent(day)}`, {
          credentials: "same-origin",
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
        const res = await fetch(`/api/yours?day=${encodeURIComponent(day)}`, {
          credentials: "same-origin",
        });
        const data = await readJson<{
          story?: { id?: string; day?: string; createdAt?: string } | null;
          earlier?: SavedMoment[];
        }>(res);
        if (cancelled) return;
        const current = data.story?.id && data.story.createdAt
          ? [{ id: data.story.id, day: data.story.day || data.story.createdAt.slice(0, 10), createdAt: data.story.createdAt }]
          : [];
        setSavedMoments(latestMoments([...current, ...(data.earlier ?? [])]));
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
    document.getElementById("joy-need")?.scrollIntoView({
      behavior: reduce ? "auto" : "smooth",
      block: "center",
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
      const sessionRes = await fetch(`/api/session?day=${encodeURIComponent(day)}`, {
        credentials: "same-origin",
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

  return (
    <div className="page">
      <header className="site-header">
        <Link className="badge" href="/">
          {LANDING.app.brand}
        </Link>
      </header>

      <main id="main">
        <section id="joy-pick" className="card card--cream card--moment" aria-labelledby="joy-heading">
          <h2 id="joy-heading" className="step-heading step-heading--navy">
            Pick your joy
          </h2>
          <JoyPicker
            name="quiet-joy-app"
            idPrefix="app-joy"
            selectedId={selectedJoyId}
            onSelect={pickJoy}
            joys={joys}
            legend={null}
            resetSignal={resetSignal}
            playbackTitle="Example: My good moment weaved"
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
          <span className="card__wash card__wash--note" aria-hidden="true"></span>
        </section>

        <nav className="step-nav step-nav--joy" aria-label="Steps">
          <StepControl direction="back" href="/" label={STEP_LABEL.start} />
          {joyMissed && needsJoyPick && !selectedJoy ? (
            <p className="step-nudge step-nudge--block step-nudge--alert" id="joy-need" role="status">
              {LANDING.app.joyNeed}
            </p>
          ) : null}
          <button
            className="step-next"
            type="button"
            aria-describedby={joyMissed && needsJoyPick && !selectedJoy ? "joy-need" : undefined}
            onClick={() => void uploadPhoto()}
          >
            Unlock/Capture
          </button>
        </nav>

        <section className="card card--lime card--compact" aria-labelledby="closing-heading">
          <h2 id="closing-heading">{LANDING.footer.somethingGood}</h2>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
