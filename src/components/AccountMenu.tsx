"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { accountMenuItems } from "@/lib/account-menu";

type AuthState = { signedIn: boolean; email: string | null };

function MenuIcon() {
  return (
    <svg className="account-menu__icon" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M5 7h14M5 12h14M5 17h14"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function AccountMenu() {
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [auth, setAuth] = useState<AuthState | null>(null);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const res = await fetch("/api/auth/session", { credentials: "same-origin" });
        const data = (await res.json()) as { signedIn?: boolean; email?: string | null };
        if (cancel) return;
        setAuth({ signedIn: Boolean(data.signedIn), email: data.email ?? null });
      } catch {
        if (!cancel) setAuth({ signedIn: false, email: null });
      }
    })();
    return () => {
      cancel = true;
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      buttonRef.current?.focus();
    };
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointer);
    const frame = window.requestAnimationFrame(() => {
      panelRef.current?.querySelector<HTMLElement>("a, button")?.focus();
    });
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointer);
    };
  }, [open]);

  async function logOut() {
    setOpen(false);
    buttonRef.current?.focus();
    const res = await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
    if (res.ok) window.location.assign("/");
  }

  const items = accountMenuItems({
    signedIn: Boolean(auth?.signedIn),
    email: auth?.email,
  });

  return (
    <div className="account-menu" ref={rootRef}>
      {open && auth ? (
        <div className="account-menu__panel" id={panelId} ref={panelRef} role="menu" aria-label="Menu">
          {items.map((item) => {
            if (item.kind === "email") {
              return (
                <p className="account-menu__email" key="email">
                  {item.email}
                </p>
              );
            }
            if (item.kind === "logout") {
              return (
                <button
                  key="logout"
                  className="account-menu__item account-menu__item--accent"
                  type="button"
                  role="menuitem"
                  onClick={() => void logOut()}
                >
                  {item.label}
                </button>
              );
            }
            const accent = item.label === "Sign in";
            return (
              <Link
                key={item.href + item.label}
                className={accent ? "account-menu__item account-menu__item--accent" : "account-menu__item"}
                href={item.href}
                role="menuitem"
                onClick={() => setOpen(false)}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      ) : null}
      <button
        ref={buttonRef}
        className="account-menu__bubble"
        type="button"
        aria-label="Menu"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((current) => !current)}
      >
        <MenuIcon />
      </button>
    </div>
  );
}
