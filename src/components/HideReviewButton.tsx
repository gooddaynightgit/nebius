"use client";

import { useState } from "react";
import { REVIEW_HIDDEN } from "@/lib/review-copy";

export default function HideReviewButton({ token }: { token: string }) {
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function hide() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/review/hide", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (!res.ok) {
        setError("This link is not valid.");
        return;
      }
      setDone(true);
    } catch {
      setError("This link is not valid.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <p className="review-thanks" role="status">
        {REVIEW_HIDDEN}
      </p>
    );
  }

  return (
    <div className="review-form">
      <button className="btn btn--lime" type="button" disabled={busy} onClick={() => void hide()}>
        {busy ? "Hiding…" : "Hide this review"}
      </button>
      {error ? (
        <p className="review-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
