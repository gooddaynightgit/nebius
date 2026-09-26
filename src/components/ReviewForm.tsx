"use client";

import { useState, type FormEvent } from "react";
import { REVIEW_COMMENT_MAX, REVIEW_KIND, REVIEW_NAME_MAX, REVIEW_THANKS, REVIEW_UNAVAILABLE } from "@/lib/review-copy";

function StarGlyph({ on }: { on: boolean }) {
  return (
    <svg className="review-star__svg" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 2.6 14.7 8.7 21.3 9.4 16.4 14l1.4 6.5L12 17.4 6.2 20.5 7.6 14 2.7 9.4 9.3 8.7 12 2.6Z"
        fill={on ? "#d4ff00" : "transparent"}
        stroke="#16324a"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function ReviewForm({ signedInEmail }: { signedInEmail: string | null }) {
  const [stars, setStars] = useState(5);
  const [comment, setComment] = useState("");
  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/review", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ stars, comment, name, website }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string; message?: string } | null;
      if (!res.ok) {
        setError(data?.error || REVIEW_UNAVAILABLE);
        return;
      }
      setDone(data?.message || REVIEW_THANKS);
    } catch {
      setError(REVIEW_UNAVAILABLE);
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <p className="review-thanks" role="status">
        {done}
      </p>
    );
  }

  return (
    <form className="review-form" onSubmit={(event) => void onSubmit(event)}>
      <fieldset className="review-stars">
        <legend>How many stars?</legend>
        <div className="review-stars__row">
          {[1, 2, 3, 4, 5].map((value) => {
            const on = value <= stars;
            return (
              <label key={value} className={on ? "review-star review-star--on" : "review-star"}>
                <input
                  type="radio"
                  name="stars"
                  value={value}
                  checked={stars === value}
                  onChange={() => setStars(value)}
                />
                <StarGlyph on={on} />
                <span className="review-star__label">
                  {value} {value === 1 ? "star" : "stars"}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <label className="review-field">
        <span>A few words</span>
        <textarea
          name="comment"
          maxLength={REVIEW_COMMENT_MAX}
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          placeholder="What stayed with you?"
        />
      </label>
      <p className="review-count">
        {comment.length} / {REVIEW_COMMENT_MAX}
      </p>

      <label className="review-field">
        <span>Name (optional)</span>
        <input
          type="text"
          name="name"
          maxLength={REVIEW_NAME_MAX}
          value={name}
          autoComplete="name"
          onChange={(event) => setName(event.target.value)}
        />
      </label>

      {signedInEmail ? <p className="review-email">We’ll attach your email with this.</p> : null}

      <label className="review-honeypot" aria-hidden="true">
        Website
        <input
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(event) => setWebsite(event.target.value)}
        />
      </label>

      {error ? (
        <p className={error === REVIEW_KIND ? "review-kind" : "review-error"} role="alert">
          {error}
        </p>
      ) : null}

      <button className="btn btn--lime" type="submit" disabled={busy}>
        {busy ? "Sending…" : "Send my review"}
      </button>
    </form>
  );
}
