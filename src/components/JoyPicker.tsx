"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import StoryPlayback from "@/components/StoryPlayback";
import { accordionJoys, LANDING, type JoyType } from "@/lib/landing";

const EMPHASIS = /(\*[^*]+\*)/g;

function Emphasized({ text }: { text: string }) {
  const parts = text.split(EMPHASIS);
  return (
    <>
      {parts.map((part, index) =>
        part.startsWith("*") && part.endsWith("*") && part.length > 1 ? (
          <em key={`${part}-${index}`}>{part.slice(1, -1)}</em>
        ) : (
          <span key={`${part}-${index}`}>{part}</span>
        ),
      )}
    </>
  );
}

type JoyPickerProps = {
  name?: string;
  idPrefix?: string;
  selectedId?: string | null;
  onSelect?: (joy: JoyType) => void;
  joys?: readonly JoyType[];
  legend?: ReactNode;
};

export default function JoyPicker({
  name = "quiet-joy",
  idPrefix = "joy",
  selectedId,
  onSelect,
  joys = accordionJoys(),
  legend = LANDING.moment.joyLegend,
}: JoyPickerProps) {
  const [internalId, setInternalId] = useState<string | null>(null);
  const selected = selectedId === undefined ? internalId : selectedId;
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!selected || !panelRef.current) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    panelRef.current.scrollIntoView({
      behavior: reduce ? "auto" : "smooth",
      block: "nearest",
    });
  }, [selected]);

  function pick(joy: JoyType) {
    if (selectedId === undefined) setInternalId(joy.id);
    onSelect?.(joy);
  }

  return (
    <fieldset className="joy-fieldset">
      <legend className="joy-legend">{legend}</legend>
      <div className="joy-list">
        {joys.map((joy) => {
          const open = selected === joy.id;
          const panelId = `${idPrefix}-panel-${joy.id}`;
          return (
            <div key={joy.id} className={open ? "joy is-open" : "joy"}>
              <label className="joy__pick">
                <input
                  type="radio"
                  name={name}
                  value={joy.id}
                  checked={open}
                  aria-controls={panelId}
                  aria-expanded={open}
                  onChange={() => pick(joy)}
                />
                <span className="joy__copy">
                  <span className="joy__title">{joy.title}</span>
                  <span className="joy__tagline">{joy.tagline}</span>
                </span>
              </label>
              {open ? (
                <div
                  id={panelId}
                  ref={panelRef}
                  className="joy__detail"
                  role="region"
                  aria-label={`${joy.title} detail`}
                >
                  <p className="joy__body">
                    <Emphasized text={joy.body} />
                  </p>
                  <p className="joy__capture">
                    <span>Capture it</span> {joy.capture}
                  </p>
                  <StoryPlayback
                    id={`${idPrefix}-playback-${joy.id}`}
                    eyebrow={LANDING.moment.playbackExample}
                  >
                    {joy.playbackTemplate}
                  </StoryPlayback>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}
