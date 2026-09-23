"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import JoyPicker from "@/components/JoyPicker";
import { readChosenJoy, writeChosenJoy } from "@/lib/chosen-joy";
import { localDay } from "@/lib/day";
import { LANDING, accordionJoys, getJoyById, type JoyType } from "@/lib/landing";

const JOY_PAGE_LEGEND = (
  <>
    {LANDING.app.joyQuestion} <em>{LANDING.app.joyPickHint}</em>
  </>
);

export default function JoyStudio() {
  const router = useRouter();
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
    router.push("/app");
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
