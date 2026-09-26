"use client";

import { useState, type FormEvent } from "react";
import type { AdminReviewRow } from "@/lib/review";
import { ADMIN_TOKEN_HINT } from "@/lib/review-copy";

export function AdminUnlock() {
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/reviews/session", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (!res.ok) {
        setError(res.status === 503 ? ADMIN_TOKEN_HINT : "That token did not match.");
        return;
      }
      window.location.reload();
    } catch {
      setError("That token did not match.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="review-form" onSubmit={(event) => void onSubmit(event)}>
      <label className="review-field">
        <span>Admin token</span>
        <input
          type="password"
          name="token"
          autoComplete="current-password"
          value={token}
          onChange={(event) => setToken(event.target.value)}
        />
      </label>
      {error ? (
        <p className="review-error" role="alert">
          {error}
        </p>
      ) : null}
      <button className="btn btn--lime" type="submit" disabled={busy}>
        {busy ? "Opening…" : "Open reviews"}
      </button>
    </form>
  );
}

export function AdminReviewList({ reviews }: { reviews: AdminReviewRow[] }) {
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");

  async function setPublished(id: string, published: boolean) {
    setBusyId(id);
    setError("");
    try {
      const res = await fetch("/api/admin/reviews", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, published }),
      });
      if (!res.ok) {
        setError("That did not update.");
        return;
      }
      window.location.reload();
    } catch {
      setError("That did not update.");
    } finally {
      setBusyId("");
    }
  }

  if (reviews.length === 0) {
    return <p className="card__body">No reviews yet.</p>;
  }

  return (
    <ul className="kind-words__list">
      {reviews.map((review) => {
        const canShow = review.stars === 4 || review.stars === 5;
        return (
          <li key={review.id} className="kind-words__card">
            <p className="kind-words__name">
              {review.stars ?? "No"} {review.stars === 1 ? "star" : "stars"} · {review.published ? "Shown" : "Hidden"}
            </p>
            {review.comment ? <p className="kind-words__comment">{review.comment}</p> : null}
            <p className="kind-words__name">{review.name}</p>
            <button
              className="btn btn--lime kind-words__action"
              type="button"
              disabled={Boolean(busyId) || (!review.published && !canShow)}
              onClick={() => void setPublished(review.id, !review.published)}
            >
              {busyId === review.id ? "Saving…" : review.published ? "Hide" : canShow ? "Show" : "Keep hidden"}
            </button>
          </li>
        );
      })}
      {error ? (
        <p className="review-error" role="alert">
          {error}
        </p>
      ) : null}
    </ul>
  );
}
