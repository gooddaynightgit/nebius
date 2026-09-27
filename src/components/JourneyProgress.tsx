"use client";

import { Suspense, useContext, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { AppProgressContext, BuyerGateContext } from "@/components/journey-gate";
import {
  JOURNEY_FINISHED_CAPTION,
  JOURNEY_STEP_COUNT,
  JOURNEY_STEPS,
  journeyBackHref,
  journeyDotKind,
  journeyFillPercent,
  journeyNextLabel,
  journeyStep,
  normalizeJourneyPath,
  rememberJourneyReached,
  type AppProgress,
  type BuyerGate,
} from "@/lib/journey";

function NextArrow() {
  return (
    <svg className="journey__arrow" viewBox="0 0 28 14" aria-hidden="true">
      <path
        d="M1 7h21.5M17.5 2.2 25.2 7l-7.7 4.8"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="journey__check" viewBox="0 0 16 16" aria-hidden="true">
      <path
        d="M3.4 8.2 6.5 11.2 12.6 4.8"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function JourneyBar({ step }: { step: number }) {
  const finished = step > JOURNEY_STEPS.length;
  const current = JOURNEY_STEPS[step - 1];
  const caption = finished ? JOURNEY_FINISHED_CAPTION : current?.label;
  const nextLabel = journeyNextLabel(step);
  const [reached, setReached] = useState(step);

  useEffect(() => {
    setReached(rememberJourneyReached(step));
  }, [step]);

  const far = Math.max(step, reached);
  const fill = journeyFillPercent(far);

  return (
    <nav className="journey" aria-label="Progress" data-journey-step={step}>
      <div className="journey__inner">
        <p className="visually-hidden">
          {finished
            ? `${JOURNEY_FINISHED_CAPTION}. All ${JOURNEY_STEP_COUNT} steps completed.`
            : `Step ${step} of ${JOURNEY_STEP_COUNT}${nextLabel ? `. Next: ${nextLabel}` : ""}`}
        </p>
        <div className="journey__row">
          <div className="journey__track" aria-hidden="true">
            <span className="journey__fill" style={{ width: `${fill}%` }} />
          </div>
          <ol className="journey__steps" role="list">
            {JOURNEY_STEPS.map((item, index) => {
              const number = index + 1;
              const kind = journeyDotKind(number, step, far);
              const done = kind === "done";
              const active = kind === "current";
              const state = active ? "journey__step--current" : done ? "journey__step--done" : "";
              const href = done ? journeyBackHref(number) : null;
              const mark = (
                <>
                  <span className="journey__dot">{done ? <CheckIcon /> : null}</span>
                  <span className="journey__label">
                    {item.label}
                    {done ? <span className="visually-hidden">, completed</span> : null}
                  </span>
                </>
              );
              return (
                <li
                  key={item.label}
                  className={state ? `journey__step ${state}` : "journey__step"}
                  aria-current={active ? "step" : undefined}
                >
                  {href ? (
                    <Link className="journey__jump" href={href} aria-label={`Go back to ${item.label}`}>
                      {mark}
                    </Link>
                  ) : (
                    mark
                  )}
                </li>
              );
            })}
          </ol>
        </div>
        <div className={finished ? "journey__captions journey__captions--finished" : "journey__captions"}>
          <div className="journey__lead">
            <p className="journey__now" aria-hidden="true">
              {caption}
            </p>
            {nextLabel ? (
              <p className="journey__next" aria-hidden="true">
                <NextArrow />
                <span className="journey__next-label">{nextLabel}</span>
              </p>
            ) : null}
          </div>
          {finished ? null : (
            <p className="journey__end" aria-hidden="true">
              {JOURNEY_FINISHED_CAPTION}
            </p>
          )}
        </div>
      </div>
    </nav>
  );
}

function JourneyProgressResolved({
  pathname,
  gate,
  appProgress,
}: {
  pathname: string;
  gate: BuyerGate;
  appProgress: AppProgress;
}) {
  const search = useSearchParams();
  const step = journeyStep(pathname, search, gate, appProgress);
  if (step == null) return null;
  return <JourneyBar step={step} />;
}

export default function JourneyProgress() {
  const pathname = usePathname() ?? "/";
  const gate = useContext(BuyerGateContext);
  const appProgress = useContext(AppProgressContext);
  if (normalizeJourneyPath(pathname) === "/") return null;
  const withoutSearch = journeyStep(pathname, { get: () => null }, gate, appProgress);
  if (withoutSearch == null) return null;

  if (normalizeJourneyPath(pathname) === "/app") {
    return (
      <Suspense fallback={<JourneyBar step={withoutSearch} />}>
        <JourneyProgressResolved pathname={pathname} gate={gate} appProgress={appProgress} />
      </Suspense>
    );
  }

  return <JourneyBar step={withoutSearch} />;
}
