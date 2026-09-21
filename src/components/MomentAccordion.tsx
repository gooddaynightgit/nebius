"use client";

import Link from "next/link";
import {
  type ChangeEvent,
  type DragEvent,
  type FormEvent,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { JOY_TYPES, LANDING, PHOTO_MAX_BYTES, WHISPER_MAX } from "@/lib/landing";

function localDay() {
  return new Intl.DateTimeFormat("en-CA").format(new Date());
}

function PhotoMoment() {
  const inputId = useId();
  const whisperId = useId();
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [whisper, setWhisper] = useState("");
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  function takeFile(file: File | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Choose a photo — a still from the day.");
      return;
    }
    if (file.size > PHOTO_MAX_BYTES) {
      setError("Keep photos under 4.5 MB.");
      return;
    }
    setError(null);
    setSaved(false);
    setPhoto(file);
    setPreview((current) => {
      if (current) URL.revokeObjectURL(current);
      return URL.createObjectURL(file);
    });
  }

  function onInput(event: ChangeEvent<HTMLInputElement>) {
    takeFile(event.target.files?.[0] ?? null);
  }

  function onDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setOver(false);
    takeFile(event.dataTransfer.files?.[0] ?? null);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!photo && !whisper.trim()) {
      setError("Drop a photo or leave a whisper first.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.set("day", localDay());
      form.set("spellDecision", "keep");
      if (photo) {
        form.set("kind", "photo");
        form.set("file", photo, photo.name || "moment.jpg");
        if (whisper.trim()) form.set("caption", whisper.trim());
      } else {
        form.set("kind", "text");
        form.set("text", whisper.trim());
      }
      const res = await fetch("/api/captures", { method: "POST", body: form });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Could not save that moment.");
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save that moment.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="moment-form" onSubmit={onSubmit}>
      <input
        id={inputId}
        className="visually-hidden"
        type="file"
        accept="image/*"
        capture="environment"
        onChange={onInput}
      />
      <label
        className={`dropzone${over ? " is-over" : ""}`}
        htmlFor={inputId}
        onDragEnter={(event) => {
          event.preventDefault();
          setOver(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={onDrop}
      >
        {preview ? (
          // User-selected blob preview — next/image cannot optimize object URLs.
          // eslint-disable-next-line @next/next/no-img-element
          <img className="dropzone__preview" src={preview} alt="Selected moment from today" />
        ) : (
          <span className="dropzone__copy">
            {LANDING.moment.photoLines.map((line) => (
              <span key={line}>{line}</span>
            ))}
          </span>
        )}
      </label>
      <p className="moment-ps">{LANDING.moment.photoPs}</p>

      <label className="whisper-label" htmlFor={whisperId}>
        {LANDING.moment.whisperLabel}
      </label>
      <input
        id={whisperId}
        className="whisper"
        type="text"
        maxLength={WHISPER_MAX}
        value={whisper}
        onChange={(event) => {
          setWhisper(event.target.value.slice(0, WHISPER_MAX));
          setSaved(false);
        }}
        placeholder={LANDING.moment.whisperExamples}
        autoComplete="off"
        spellCheck
      />
      <p className="whisper-count" aria-live="polite">
        {whisper.length} / {WHISPER_MAX}
      </p>

      <button className="btn btn--lime" type="submit" disabled={busy}>
        {busy ? "Saving…" : "Keep this moment"}
      </button>
      {saved ? (
        <p className="notice">
          Saved to your vault.{" "}
          <Link href="/app">Hear your story — free</Link>
        </p>
      ) : null}
      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}

function JoyPicker() {
  const [selected, setSelected] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!selected || !panelRef.current) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    panelRef.current.scrollIntoView({
      behavior: reduce ? "auto" : "smooth",
      block: "nearest",
    });
  }, [selected]);

  return (
    <fieldset className="joy-fieldset">
      <legend className="joy-legend">{LANDING.moment.joyLegend}</legend>
      <div className="joy-list">
        {JOY_TYPES.map((joy) => {
          const open = selected === joy.id;
          const panelId = `joy-panel-${joy.id}`;
          return (
            <div key={joy.id} className={open ? "joy is-open" : "joy"}>
              <label className="joy__pick">
                <input
                  type="radio"
                  name="quiet-joy"
                  value={joy.id}
                  checked={open}
                  aria-controls={panelId}
                  aria-expanded={open}
                  onChange={() => setSelected(joy.id)}
                />
                <span>{joy.title}</span>
              </label>
              {open ? (
                <div
                  id={panelId}
                  ref={panelRef}
                  className="joy__detail"
                  role="region"
                  aria-label={`${joy.title} detail`}
                >
                  <p className="joy__tagline">{joy.tagline}</p>
                  <p className="joy__body">{joy.body}</p>
                  <p className="joy__capture">
                    <span>Capture it</span> {joy.capture}
                  </p>
                  <aside
                    id={`playback-${joy.id}`}
                    className="playback"
                    aria-label="Story playback"
                  >
                    <h3>Story playback</h3>
                    <p>{joy.playback}</p>
                  </aside>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}

export default function MomentAccordion() {
  return (
    <section className="card card--cream card--moment" aria-labelledby="moment-heading">
      <details className="accordion" open>
        <summary>
          <h2 id="moment-heading">{LANDING.moment.title}</h2>
        </summary>
        <div className="accordion__body">
          <details className="accordion accordion--nested" open>
            <summary>
              <h3>{LANDING.moment.pictureTitle}</h3>
            </summary>
            <div className="accordion__body">
              <PhotoMoment />
            </div>
          </details>
          <JoyPicker />
        </div>
      </details>
      <span className="card__wash card__wash--note" aria-hidden="true"></span>
    </section>
  );
}
