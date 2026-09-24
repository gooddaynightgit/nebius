"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import JoyPicker from "@/components/JoyPicker";
import StepControl from "@/components/StepControl";
import { readChosenJoy, writeChosenJoy } from "@/lib/chosen-joy";
import { localDay } from "@/lib/day";
import { STEP_LABEL } from "@/lib/journey";
import { LANDING, accordionJoys, getJoyById, type JoyType } from "@/lib/landing";
import {
  SAVED_JOY_MOMENTS_ID,
  SAVED_JOY_MOMENTS_LABEL,
  chooseStoryJoy,
  openSavedJoyMoments,
} from "@/lib/saved-joy-moments";

const JOY_PAGE_LEGEND = (
  <>
    {LANDING.app.joyQuestion} <em>{LANDING.app.joyPickHint}</em>
  </>
);

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
    chooseStoryJoy(joy.id, (joyId) => {
      writeChosenJoy(day, joyId);
      setSelectedJoyId(joyId);
    });
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
            legend={JOY_PAGE_LEGEND}
            trailingChoice={{
              id: SAVED_JOY_MOMENTS_ID,
              title: SAVED_JOY_MOMENTS_LABEL,
              onChoose: () => openSavedJoyMoments((href) => window.location.assign(href)),
            }}
          />
          <span className="card__wash card__wash--note" aria-hidden="true"></span>
        </section>

        <nav className="step-nav" aria-label="Steps">
          <StepControl direction="back" href="/" label={STEP_LABEL.start} />
          {selectedJoy ? null : <p className="step-nudge">{LANDING.app.joyNeed}</p>}
          <StepControl
            direction="next"
            href="/app"
            label={STEP_LABEL.joy}
            disabled={!selectedJoy}
            tone="soft"
          />
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
