"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { withClientClock, useLocalDay } from "@/lib/client-day";
import { readJson } from "@/lib/client-fetch";
import {
  SAVED_TODAY_EMPTY,
  SAVED_TODAY_LABEL,
  type TodaySavedMoment,
} from "@/lib/saved-today";

type Props = {
  moments?: TodaySavedMoment[];
};

export default function SavedMomentsToday({ moments: provided }: Props = {}) {
  const day = useLocalDay();
  const [open, setOpen] = useState(false);
  const [fetched, setFetched] = useState<TodaySavedMoment[] | null>(provided ? provided : null);
  const panelId = useId();
  const moments = provided ?? fetched;

  useEffect(() => {
    if (provided) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          withClientClock(`/api/yours?day=${encodeURIComponent(day)}&list=today`),
          { credentials: "same-origin", cache: "no-store" },
        );
        const data = await readJson<{ moments?: TodaySavedMoment[] }>(res);
        if (cancelled) return;
        setFetched(Array.isArray(data.moments) ? data.moments : []);
      } catch {
        if (!cancelled) setFetched([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [day, provided]);

  return (
    <div className={open ? "noticing is-open" : "noticing"}>
      <button
        type="button"
        className="noticing__bar pastel-banner"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="noticing__label">{SAVED_TODAY_LABEL}</span>
        <span className="noticing__chevron" aria-hidden="true" />
      </button>
      <div id={panelId} className="noticing__panel noticing__panel--saved" hidden={!open}>
        {moments == null ? null : moments.length === 0 ? (
          <p className="noticing__empty">{SAVED_TODAY_EMPTY}</p>
        ) : (
          <ul>
            {moments.map((item) => (
              <li key={item.id}>
                <Link className="saved-today__link" href={`/app/yours?story=${encodeURIComponent(item.id)}`}>
                  {item.captureId ? (
                    <img
                      className="saved-today__thumb"
                      src={`/api/media/${encodeURIComponent(item.captureId)}`}
                      alt=""
                    />
                  ) : null}
                  <span className="saved-today__copy">
                    <span className="saved-today__time">{item.time}</span>
                    <span className="saved-today__lead">{item.excerpt}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
