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

export type JoyTrailingChoice = {
  id: string;
  title: string;
  onChoose: () => void;
};

type JoyPickerProps = {
  name?: string;
  idPrefix?: string;
  selectedId?: string | null;
  onSelect?: (joy: JoyType) => void;
  joys?: readonly JoyType[];
  /** Visible question. Null hides it and keeps a screen-reader name. */
  legend?: ReactNode | null;
  /** Extra radio after the catalog joys. Choosing it does not call onSelect. */
  trailingChoice?: JoyTrailingChoice;
  /** Bump this when the page is shown again so a cached trailing radio closes. */
  resetSignal?: number;
  /** Example-box heading. Defaults to the shared landing title. */
  playbackTitle?: string;
  /** Intro above the example heading. Null removes it. */
  playbackEyebrow?: string | null;
  /** Line under the heading on the joy-page example card. */
  playbackLead?: string;
  /** Joy page uses the dark Nebius-style card. Landing stays plain. */
  playbackVariant?: "plain" | "weaved";
  /** Joy page only: mark every radio while nothing in this group is chosen. */
  promptWhenEmpty?: boolean;
  /** Fires when the empty-prompt state changes. Joy page colours its helper from this. */
  onEmptyChange?: (empty: boolean) => void;
};

export default function JoyPicker({
  name = "quiet-joy",
  idPrefix = "joy",
  selectedId,
  onSelect,
  joys = accordionJoys(),
  legend = LANDING.moment.joyLegend,
  trailingChoice,
  resetSignal = 0,
  playbackTitle = LANDING.moment.playbackTitle,
  playbackEyebrow = LANDING.moment.playbackExample,
  playbackLead,
  playbackVariant = "plain",
  promptWhenEmpty = false,
  onEmptyChange,
}: JoyPickerProps) {
  const [internalId, setInternalId] = useState<string | null>(null);
  const [trailingOpen, setTrailingOpen] = useState(false);
  const selected = selectedId === undefined ? internalId : selectedId;
  const panelRef = useRef<HTMLDivElement | null>(null);
  const unset = promptWhenEmpty && !selected && !trailingOpen;

  useEffect(() => {
    setTrailingOpen(false);
  }, [resetSignal]);

  useEffect(() => {
    if (!promptWhenEmpty) return;
    onEmptyChange?.(unset);
  }, [promptWhenEmpty, unset, onEmptyChange]);

  useEffect(() => {
    if (!selected || !panelRef.current) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    panelRef.current.scrollIntoView({
      behavior: reduce ? "auto" : "smooth",
      block: "nearest",
    });
  }, [selected]);

  function pick(joy: JoyType) {
    setTrailingOpen(false);
    if (selectedId === undefined) setInternalId(joy.id);
    onSelect?.(joy);
  }

  function chooseTrailing() {
    if (!trailingChoice) return;
    setTrailingOpen(true);
    trailingChoice.onChoose();
  }

  return (
    <fieldset className={unset ? "joy-fieldset joy-fieldset--unset" : "joy-fieldset"}>
      <legend className={legend ? "joy-legend" : "visually-hidden"}>{legend || "Pick your joy"}</legend>
      <div className="joy-list">
        {joys.map((joy) => {
          const open = !trailingOpen && selected === joy.id;
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
                  onClick={() => {
                    if (open) pick(joy);
                  }}
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
                    title={playbackTitle}
                    eyebrow={playbackEyebrow ?? undefined}
                    lead={playbackLead}
                    variant={playbackVariant}
                  >
                    {joy.playbackTemplate}
                  </StoryPlayback>
                </div>
              ) : null}
            </div>
          );
        })}
        {trailingChoice ? (
          <div className={trailingOpen ? "joy is-open" : "joy"}>
            <label className="joy__pick">
              <input
                type="radio"
                name={name}
                value={trailingChoice.id}
                checked={trailingOpen}
                onChange={chooseTrailing}
              />
              <span className="joy__copy">
                <span className="joy__title">{trailingChoice.title}</span>
              </span>
            </label>
          </div>
        ) : null}
      </div>
    </fieldset>
  );
}
