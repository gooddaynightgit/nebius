"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import JoyPicker from "@/components/JoyPicker";
import StepControl from "@/components/StepControl";
import { readJson } from "@/lib/client-fetch";
import { readChosenJoy, writeChosenJoy } from "@/lib/chosen-joy";
import { localDay } from "@/lib/day";
import { STEP_LABEL } from "@/lib/journey";
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
  const selectedJoy = getJoyById(selectedJoyId) ?? getJoyById(readChosenJoy(day));
  const joys = useMemo(() => {
    const base = accordionJoys();
    if (selectedJoy && !base.some((joy) => joy.id === selectedJoy.id)) {
      return [...base, selectedJoy];
    }
    return base;
  }, [selectedJoy]);

  useEffect(() => {
    if (pathname && pathname !== "/app/joy") return;
    function restoreCatalogJoy() {
      const stored = readChosenJoy(day);
      setSelectedJoyId(stored && getJoyById(stored) ? stored : null);
      setResetSignal((current) => current + 1);
    }
    restoreCatalogJoy();
    const onPageShow = () => restoreCatalogJoy();
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
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

  function pickJoy(joy: JoyType) {
    chooseStoryJoy(joy.id, (joyId) => {
      writeChosenJoy(day, joyId);
      setSelectedJoyId(joyId);
    });
  }

  async function uploadPhoto() {
    const selectedJoy = getJoyById(selectedJoyId) ?? getJoyById(readChosenJoy(day));
    if (!selectedJoy) return;
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
          <button
            className="step-next"
            type="button"
            aria-describedby={selectedJoy ? undefined : "joy-need"}
            onClick={() => void uploadPhoto()}
          >
            Unlock/Capture
          </button>
        </nav>
        {selectedJoy ? null : (
          <p className="step-nudge step-nudge--block" id="joy-need" role="status">
            {LANDING.app.joyNeed}
          </p>
        )}

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
