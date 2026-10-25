"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { authAttempt, type AuthBody } from "@/lib/auth-note";
import { readResponsePayload } from "@/lib/client-fetch";
import { followVerifiedLogin } from "@/lib/login-destination";
import { PRIVACY_NOTE } from "@/lib/privacy";
import {
  REQUEST_SENT,
  REQUEST_UNAVAILABLE,
  REQUEST_WAIT,
  RESEND_COOLDOWN_SECONDS,
  RESEND_SENT,
  RESEND_WAIT,
  SPAM_HINT,
  VERIFY_FAIL,
} from "@/lib/otp-copy";
import { isSixDigitCode } from "@/lib/verify-code";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalize(raw: string): string {
  return raw.trim().toLowerCase();
}

function noteClass(note: string): string {
  if (note === REQUEST_SENT || note === RESEND_SENT) return "moments-status otp-sent";
  if (note === VERIFY_FAIL) return "moments-status otp-wrong";
  return "moments-status";
}

function emailOk(raw: string): boolean {
  const email = normalize(raw);
  return email.length > 3 && email.length < 254 && EMAIL_RE.test(email);
}

/** `onVerified` lets another page (Something Good) carry on in place instead of redirecting. */
export default function SignInForm({ onVerified }: { onVerified?: () => void } = {}) {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const verifyLock = useRef(false);
  const autoTried = useRef("");
  /** Email the last code went to. Set only after the server said it was sent. */
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown((left) => Math.max(0, left - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  const normalized = normalize(email);

  async function sendCode(resend = false) {
    if (!emailOk(email)) {
      setNote("Enter a valid email.");
      return;
    }
    if (resend && cooldown > 0) return;
    setBusy(true);
    setNote(resend ? "Sending a new code…" : "Sending a code…");
    try {
      const res = await fetch("/api/auth/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ email: normalized }),
      });
      const data = await readResponsePayload<AuthBody>(res);
      const attempt = authAttempt(data, res.ok, REQUEST_UNAVAILABLE);
      const sent = attempt.accepted && attempt.note === REQUEST_SENT;
      if (sent) {
        // A fresh code replaces the old one on the server, so clear what was typed.
        setCode("");
        autoTried.current = "";
        setSentTo(normalized);
        setCooldown(RESEND_COOLDOWN_SECONDS);
        setNote(resend ? RESEND_SENT : REQUEST_SENT);
      } else if (attempt.note === REQUEST_WAIT) {
        setNote(sentTo ? RESEND_WAIT : REQUEST_WAIT);
      } else {
        setNote(attempt.note);
      }
    } catch {
      setNote(REQUEST_UNAVAILABLE);
    } finally {
      setBusy(false);
    }
  }

  function changeEmail() {
    setSentTo(null);
    setCooldown(0);
    setCode("");
    setEmail("");
    setNote(null);
    autoTried.current = "";
    window.setTimeout(() => document.getElementById("signin-email")?.focus(), 0);
  }

  async function verifyCode() {
    if (verifyLock.current) return;
    if (!emailOk(email)) {
      setNote("Enter a valid email.");
      return;
    }
    if (!isSixDigitCode(code)) {
      setNote("Enter the 6-digit code from your email.");
      return;
    }
    verifyLock.current = true;
    setBusy(true);
    setNote("Checking…");
    try {
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ email: normalized, code: code.trim() }),
      });
      const data = await readResponsePayload<AuthBody>(res);
      const attempt = authAttempt(data, res.ok, VERIFY_FAIL);
      if (!attempt.accepted) {
        setNote(attempt.note);
        return;
      }
      if (onVerified) {
        onVerified();
        return;
      }
      window.location.assign(followVerifiedLogin(data.next));
    } catch {
      setNote("We couldn’t check that code right now.");
    } finally {
      verifyLock.current = false;
      setBusy(false);
    }
  }

  const verifyRef = useRef(verifyCode);
  verifyRef.current = verifyCode;

  useEffect(() => {
    if (!isSixDigitCode(code) || !emailOk(email)) return;
    const key = `${normalized}:${code.trim()}`;
    if (autoTried.current === key) return;
    autoTried.current = key;
    void verifyRef.current();
  }, [code, email, normalized]);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void verifyCode();
  }

  return (
    <form className="moments-buy" onSubmit={onSubmit}>
      <label className="whisper-label" htmlFor="signin-email">
        Email
      </label>
      <input
        id="signin-email"
        className="whisper"
        name="email"
        type="email"
        inputMode="email"
        autoComplete="email"
        required
        maxLength={253}
        value={email}
        readOnly={Boolean(sentTo)}
        onChange={(event) => {
          setEmail(event.target.value);
          setNote(null);
        }}
      />
      {sentTo ? null : (
        <button className="btn moments-code" type="button" disabled={busy} onClick={() => void sendCode()}>
          Email me a code
        </button>
      )}
      <label className="whisper-label" htmlFor="signin-code">
        Code
      </label>
      <input
        id="signin-code"
        className={note === VERIFY_FAIL ? "whisper whisper--alert" : "whisper"}
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
      <button
        className={note === VERIFY_FAIL ? "btn verify-code verify-code--alert" : "btn verify-code"}
        type="button"
        disabled={busy}
        onClick={() => void verifyCode()}
      >
        Verify code
      </button>
      <div aria-live="polite" aria-atomic="true">
        {note ? (
          <p className={noteClass(note)} role="status">
            {note}
          </p>
        ) : null}
      </div>
      {sentTo ? (
        <div className="otp-help">
          <p className="otp-spam-hint">{SPAM_HINT}</p>
          <div className="otp-help-actions">
            <button
              className="btn-link otp-resend"
              type="button"
              disabled={busy || cooldown > 0}
              aria-disabled={busy || cooldown > 0}
              onClick={() => void sendCode(true)}
            >
              {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
            </button>
            <button className="btn-link otp-other-email" type="button" onClick={changeEmail}>
              Use a different email
            </button>
          </div>
        </div>
      ) : null}
      <p className="privacy-note">{PRIVACY_NOTE}</p>
    </form>
  );
}
