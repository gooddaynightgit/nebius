"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { authAttempt, type AuthBody } from "@/lib/auth-note";
import { readResponsePayload } from "@/lib/client-fetch";
import { followVerifiedLogin } from "@/lib/login-destination";
import { PRIVACY_NOTE } from "@/lib/privacy";
import { isSixDigitCode } from "@/lib/verify-code";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalize(raw: string): string {
  return raw.trim().toLowerCase();
}

function emailOk(raw: string): boolean {
  const email = normalize(raw);
  return email.length > 3 && email.length < 254 && EMAIL_RE.test(email);
}

export default function SignInForm() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const verifyLock = useRef(false);
  const autoTried = useRef("");

  const normalized = normalize(email);

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
      const attempt = authAttempt(data, res.ok, "That code didn’t work. Request a new one.");
      if (!attempt.accepted) {
        setNote(attempt.note);
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
        onChange={(event) => {
          setEmail(event.target.value);
          setNote(null);
        }}
      />
      <button className="btn moments-code" type="button" disabled={busy} onClick={() => void sendCode()}>
        Email me a code
      </button>
      <label className="whisper-label" htmlFor="signin-code">
        Code
      </label>
      <input
        id="signin-code"
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
      <button className="btn verify-code" type="button" disabled={busy} onClick={() => void verifyCode()}>
        Verify code
      </button>
      {note ? (
        <p className="moments-status" role="status">
          {note}
        </p>
      ) : null}
      <p className="privacy-note">{PRIVACY_NOTE}</p>
    </form>
  );
}
