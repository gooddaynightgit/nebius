"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import JoyPicker from "@/components/JoyPicker";
import { readResponsePayload } from "@/lib/client-fetch";
import { readCaptureStash } from "@/lib/capture-stash";
import { readChosenJoy, writeChosenJoy } from "@/lib/chosen-joy";
import { localDay } from "@/lib/day";
import { LANDING, accordionJoys, getJoyById, type JoyType } from "@/lib/landing";
import { hasSavedGoodMoment } from "@/lib/saved-moment";

const JOY_PAGE_LEGEND = (
  <>
    {LANDING.app.joyQuestion} <em>{LANDING.app.joyPickHint}</em>
  </>
);

function AlreadyPicked({ day }: { day: string }) {
  const [saved, setSaved] = useState<boolean | null>(null);
  const [emptyNote, setEmptyNote] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [res, stash] = await Promise.all([
          fetch(`/api/session?day=${encodeURIComponent(day)}`, { credentials: "same-origin" }).catch(
            () => null,
          ),
          readCaptureStash(day).catch(() => null),
        ]);
        const data = res
          ? await readResponsePayload<{
              todayPhoto?: unknown;
              yoursOpened?: boolean;
              lastStory?: unknown;
            }>(res)
          : {};
        if (cancelled) return;
        setSaved(
          hasSavedGoodMoment({
            todayPhoto: data.todayPhoto,
            yoursOpened: data.yoursOpened,
            lastStory: data.lastStory,
            stash,
          }),
        );
      } catch {
        if (!cancelled) setSaved(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [day]);

  useEffect(() => {
    if (!pending || saved === null) return;
    if (saved) {
      window.location.assign("/app/yours");
      return;
    }
    setEmptyNote(true);
    setPending(false);
  }, [pending, saved]);

  return (
    <p className="already-picked">
      {saved ? (
        <Link className="already-picked__link" href="/app/yours">
          {LANDING.app.alreadyPicked}
        </Link>
      ) : (
        <button
          type="button"
          className="already-picked__link"
          aria-busy={saved === null}
          onClick={() => {
            if (saved === false) {
              setEmptyNote(true);
              return;
            }
            setPending(true);
          }}
        >
          {LANDING.app.alreadyPicked}
        </button>
      )}
      {emptyNote ? (
        <span className="already-picked__note" role="status">
          {LANDING.app.alreadyPickedEmpty}
        </span>
      ) : null}
    </p>
  );
}

export default function JoyStudio() {
  const day = useMemo(() => localDay(), []);
  const [selectedJoyId, setSelectedJoyId] = useState<string | null>(null);
  const selectedJoy = getJoyById(selectedJoyId);
  const joys = useMemo(() => {
    const base = accordionJoys();
    if (selectedJoy && !base.some((joy) => joy.id === selectedJoy.id)) {
      return [...base, selectedJoy];
    }
    return base;
  }, [selectedJoy]);

  useEffect(() => {
    setSelectedJoyId(readChosenJoy(day));
  }, [day]);

  function pickJoy(joy: JoyType) {
    writeChosenJoy(day, joy.id);
    setSelectedJoyId(joy.id);
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
          <span className="pill">Joy</span>
          <h2 id="joy-heading" className="visually-hidden">
            {LANDING.app.joyQuestion}
          </h2>
          <AlreadyPicked day={day} />
          <JoyPicker
            name="quiet-joy-app"
            idPrefix="app-joy"
            selectedId={selectedJoyId}
            onSelect={pickJoy}
            joys={joys}
            legend={JOY_PAGE_LEGEND}
          />
          <span className="card__wash card__wash--note" aria-hidden="true"></span>
        </section>

        <nav className="step-nav" aria-label="Steps">
          <Link className="step-arrow" href="/" aria-label="Previous step">
            ←
          </Link>
          {selectedJoy ? (
            <Link className="photo-next" href="/app" aria-label="Next step">
              <span className="photo-cue" aria-hidden="true">
                <span className="card__mark"></span>
              </span>
              <span className="photo-next__arrow" aria-hidden="true">
                →
              </span>
            </Link>
          ) : (
            <>
              <p className="step-nudge">{LANDING.app.joyNeed}</p>
              <span className="step-arrow step-arrow--disabled" aria-disabled="true" aria-label="Next step">
                →
              </span>
            </>
          )}
        </nav>

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
