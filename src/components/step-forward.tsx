"use client";

import Link from "next/link";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { normalizeJourneyPath } from "@/lib/journey";

export type StepForward = {
  label: string;
  enabled: boolean;
  run: () => void;
};

const StepForwardContext = createContext<StepForward | null>(null);
const SetStepForwardContext = createContext<(next: StepForward | null) => void>(() => {});

/** Step pages whose pinned button has a next step. Final and non-step pages stay off this list. */
const STEP_FORWARD_PATHS = ["/app/joy", "/moments", "/app", "/app/yours"];

export function stepPageShowsForward(pathname: string | null): boolean {
  if (!pathname) return true;
  return STEP_FORWARD_PATHS.includes(normalizeJourneyPath(pathname));
}

export function StepForwardProvider({ children }: { children: ReactNode }) {
  const [action, setAction] = useState<StepForward | null>(null);
  const set = useCallback((next: StepForward | null) => {
    setAction(next);
  }, []);
  return (
    <SetStepForwardContext.Provider value={set}>
      <StepForwardContext.Provider value={action}>{children}</StepForwardContext.Provider>
    </SetStepForwardContext.Provider>
  );
}

export function useStepForward(): StepForward | null {
  return useContext(StepForwardContext);
}

/** The page's pinned next action. Pass null on the final step and on pages that are not steps. */
export function useRegisterStepForward(action: StepForward | null) {
  const set = useContext(SetStepForwardContext);
  const runRef = useRef(action?.run);
  runRef.current = action?.run;
  const label = action?.label ?? "";
  const enabled = Boolean(action?.enabled);
  const active = action !== null;
  useEffect(() => {
    if (!active) {
      set(null);
      return () => set(null);
    }
    set({
      label,
      enabled,
      run: () => runRef.current?.(),
    });
    return () => set(null);
  }, [active, enabled, label, set]);
}

function ArrowIcon({ direction }: { direction: "back" | "forward" }) {
  const d = direction === "back" ? "M19 12H6M11 6 5 12l6 6" : "M5 12h13M13 6l6 6-6 6";
  return (
    <svg className="step-float__icon" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d={d}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** One navy pill: back to the landing page, and the next step when this page has one. */
export function StepFloat({
  action,
  showForward,
}: {
  action: StepForward | null;
  showForward: boolean;
}) {
  return (
    <nav className="step-float" aria-label="Steps">
      <Link className="step-float__back" href="/" aria-label="Back to start">
        <ArrowIcon direction="back" />
      </Link>
      {showForward && action ? (
        <button
          className="step-float__next"
          type="button"
          disabled={!action.enabled}
          aria-label={action.label}
          onClick={() => {
            if (action.enabled) action.run();
          }}
        >
          <span className="step-float__label">{action.label}</span>
          <ArrowIcon direction="forward" />
        </button>
      ) : null}
    </nav>
  );
}
