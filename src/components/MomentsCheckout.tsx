"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { authAttempt, type AuthBody } from "@/lib/auth-note";
import { readJson, readResponsePayload } from "@/lib/client-fetch";
import { PRIVACY_NOTE } from "@/lib/privacy";
import { EMAIL_VERIFIED_NOTE, isSixDigitCode } from "@/lib/verify-code";

type SessionPeek = {
  email?: string | null;
  otpVerified?: boolean;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalize(raw: string): string {
  return raw.trim().toLowerCase();
}

function emailOk(raw: string): boolean {
  const email = normalize(raw);
  return email.length > 3 && email.length < 254 && EMAIL_RE.test(email);
}

export default function MomentsCheckout() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [verifiedEmail, setVerifiedEmail] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const verifyLock = useRef(false);
  const autoTried = useRef("");

  const normalized = normalize(email);
  const verified = Boolean(verifiedEmail && verifiedEmail === normalized && emailOk(normalized));

  useEffect(() => {
    let cancel = false;
    void fetch("/api/session", { credentials: "same-origin" })
      .then((res) => readJson<SessionPeek>(res))
      .then((data) => {
        if (cancel || !data.otpVerified || !data.email || !emailOk(data.email)) return;
        const known = normalize(data.email);
        setEmail(known);
        setVerifiedEmail(known);
      })
      .catch(() => {
        // Checkout still asks for a code when this session is not verified.
      });
    return () => {
      cancel = true;
    };
  }, []);

  async function sendCode() {
    if (!emailOk(email)) {
      setNote("Enter a valid email.");
      return;
    }
    setBusy(true);
    setNote("Sending a code…");
    try {
      const res = await fetch("/api/auth/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ email: normalized }),
      });
      const data = await readResponsePayload<AuthBody>(res);
      if (verifiedEmail === normalized) setVerifiedEmail(null);
      setCode("");
      autoTried.current = "";
      setNote(authAttempt(data, res.ok, "We couldn’t send a code right now.").note);
    } catch {
      setNote("We couldn’t send a code right now.");
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode() {
    if (verifyLock.current || verified) return;
    if (!emailOk(email)) {
      setVerifiedEmail(null);
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
        body: JSON.stringify({ email: normalized, code: code.trim(), mode: "checkout" }),
      });
      const data = await readResponsePayload<AuthBody>(res);
      const attempt = authAttempt(data, res.ok, "That code didn’t work. Request a new one.");
      if (!attempt.accepted) {
        setVerifiedEmail(null);
        setNote(attempt.note);
        return;
      }
      setVerifiedEmail(normalized);
      setNote(EMAIL_VERIFIED_NOTE);
    } catch {
      setVerifiedEmail(null);
      setNote("We couldn’t check that code right now.");
    } finally {
      verifyLock.current = false;
      setBusy(false);
    }
  }

  const verifyRef = useRef(verifyCode);
  verifyRef.current = verifyCode;

  useEffect(() => {
    if (verified || !isSixDigitCode(code) || !emailOk(email)) return;
    const key = `${normalized}:${code.trim()}`;
    if (autoTried.current === key) return;
    autoTried.current = key;
    void verifyRef.current();
  }, [code, email, normalized, verified]);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    if (verified) return;
    event.preventDefault();
    void verifyCode();
  }

  return (
    <form className="moments-buy" method="post" action="/api/payfast/checkout" onSubmit={onSubmit}>
      <label className="whisper-label" htmlFor="moments-email">
        Email
      </label>
      <input
        id="moments-email"
        className="whisper"
        name="email"
        type="email"
        inputMode="email"
        autoComplete="email"
        required
        maxLength={253}
        value={email}
        onChange={(event) => {
          setEmail(event.target.value);
          setNote(null);
        }}
      />
      <button className="btn moments-code" type="button" disabled={busy} onClick={() => void sendCode()}>
        Email me a code
      </button>
      <label className="whisper-label" htmlFor="moments-code">
        Code
      </label>
      <input
        id="moments-code"
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
      {verified ? null : (
        <button className="btn btn--lime verify-code" type="button" disabled={busy} onClick={() => void verifyCode()}>
          Verify code
        </button>
      )}
      {note ? (
        <p className="moments-status" role="status">
          {note}
        </p>
      ) : null}
      <p className="privacy-note">{PRIVACY_NOTE}</p>
      <button className="moments-cta" type="submit" disabled={!verified || busy}>
        Start hunting — R450 ZAR / $28 USD
      </button>
    </form>
  );
}
