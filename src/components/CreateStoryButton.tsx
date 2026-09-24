"use client";

import { FormEvent, useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { readJson } from "@/lib/client-fetch";
import { localDay } from "@/lib/day";
import { LANDING } from "@/lib/landing";
import { PRIVACY_NOTE } from "@/lib/privacy";
import { createStoryDestination } from "@/lib/story-entry";
import type { SessionState } from "@/lib/types";

function emailOk(email: string): boolean {
  return email.length > 3 && email.length < 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function CreateStoryButton() {
  const router = useRouter();
  const day = useMemo(() => localDay(), []);
  const formId = useId();
  const emailId = useId();
  const codeId = useId();
  const emailRef = useRef<HTMLInputElement | null>(null);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) emailRef.current?.focus();
  }, [open]);

  async function goWithBalance(address: string) {
    const res = await fetch("/api/payfast/entitlement", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ email: address }),
    });
    const data = await readJson<{ remaining?: number; error?: string }>(res);
    if (!res.ok) {
      setNote(data.error || "Couldn't check your moments. Try again.");
      return;
    }
    const destination = createStoryDestination(true, data.remaining ?? 0);
    if (destination === "sign-in") return;
    router.push(destination);
  }

  async function onCreate() {
    setNote(null);
    try {
      const sessionRes = await fetch(`/api/session?day=${encodeURIComponent(day)}`, {
        credentials: "same-origin",
      });
      const session = await readJson<SessionState>(sessionRes);
      if (session.otpVerified && session.email) {
        await goWithBalance(session.email);
        return;
      }
    } catch {
      setNote(LANDING.app.reachLive);
      return;
    }
    setOpen(true);
  }

  async function sendCode() {
    const address = email.trim().toLowerCase();
    if (!emailOk(address)) {
      setNote("That doesn’t look like an email yet.");
      return;
    }
    setBusy(true);
    setNote("Sending a code…");
    try {
      const res = await fetch("/api/auth/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ email: address }),
      });
      const data = await readJson<{ message?: string; error?: string }>(res);
      setNote(data.message || data.error || "We couldn’t send a code right now.");
    } catch {
      setNote("We couldn’t send a code right now.");
    } finally {
      setBusy(false);
    }
  }

  async function verify(event: FormEvent) {
    event.preventDefault();
    const address = email.trim().toLowerCase();
    if (!emailOk(address)) {
      setNote("That doesn’t look like an email yet.");
      return;
    }
    if (!/^\d{6}$/.test(code.trim())) {
      setNote("Enter the 6-digit code from your email.");
      return;
    }
    setNote("Checking…");
    try {
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ email: address, code: code.trim(), mode: "buyer" }),
      });
      const data = await readJson<{ ok?: boolean; message?: string; error?: string }>(res);
      if (!res.ok || !data.ok) {
        setNote(data.message || data.error || "That code didn’t work. Request a new one.");
        return;
      }
    } catch {
      setNote("We couldn’t check that code right now.");
      return;
    }
    await goWithBalance(address);
  }

  return (
    <div className="create-story">
      <nav className="step-nav" aria-label="Create your story">
        <button
          className="step-next"
          type="button"
          aria-expanded={open}
          aria-controls={formId}
          onClick={() => void onCreate()}
        >
          Create your story
        </button>
      </nav>
      {open ? (
        <form id={formId} className="buyer-email create-story__gate" onSubmit={(event) => void verify(event)}>
          <label className="whisper-label" htmlFor={emailId}>
            Email
          </label>
          <input
            id={emailId}
            ref={emailRef}
            className="whisper"
            type="text"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              setNote(null);
            }}
          />
          <button className="btn btn--lime" type="button" disabled={busy} onClick={() => void sendCode()}>
            Email me a code
          </button>
          <label className="whisper-label" htmlFor={codeId}>
            Code
          </label>
          <input
            id={codeId}
            className="whisper"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(event) => {
              setCode(event.target.value.replace(/\D/g, "").slice(0, 6));
              setNote(null);
            }}
          />
          <button className="btn btn--lime" type="submit">
            Open my moments
          </button>
          <p className="privacy-note">{PRIVACY_NOTE}</p>
        </form>
      ) : null}
      {note ? (
        <p className="buyer-email__note" role="status">
          {note}
        </p>
      ) : null}
    </div>
  );
}
