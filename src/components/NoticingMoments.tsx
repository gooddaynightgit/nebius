"use client";

import { useId, useState } from "react";
import { LANDING } from "@/lib/landing";

export default function NoticingMoments() {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  return (
    <div className={open ? "noticing is-open" : "noticing"}>
      <button
        type="button"
        className="noticing__bar pastel-banner"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="noticing__label">{LANDING.app.noticingTitle}</span>
        <span className="noticing__chevron" aria-hidden="true" />
      </button>
      <div id={panelId} className="noticing__panel" hidden={!open}>
        <ul>
          {LANDING.app.noticing.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
