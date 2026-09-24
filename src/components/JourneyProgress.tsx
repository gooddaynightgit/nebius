"use client";

import { Suspense, useContext } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { AppProgressContext, BuyerGateContext } from "@/components/journey-gate";
import {
  JOURNEY_FINISHED_CAPTION,
  JOURNEY_STEP_COUNT,
  JOURNEY_STEPS,
  journeyFillPercent,
  journeyStep,
  normalizeJourneyPath,
  type AppProgress,
  type BuyerGate,
} from "@/lib/journey";

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
  const fill = journeyFillPercent(step);

  return (
    <nav className="journey" aria-label="Progress" data-journey-step={step}>
      <div className="journey__inner">
        <p className="visually-hidden">
          {finished
            ? `${JOURNEY_FINISHED_CAPTION}. All ${JOURNEY_STEP_COUNT} steps completed.`
            : `Step ${step} of ${JOURNEY_STEP_COUNT}`}
        </p>
        <div className="journey__row">
          <div className="journey__track" aria-hidden="true">
            <span className="journey__fill" style={{ width: `${fill}%` }} />
          </div>
          <ol className="journey__steps" role="list">
            {JOURNEY_STEPS.map((item, index) => {
              const number = index + 1;
              const done = number < step;
              const active = number === step;
              const state = active ? "journey__step--current" : done ? "journey__step--done" : "";
              return (
                <li
                  key={item.label}
                  className={state ? `journey__step ${state}` : "journey__step"}
                  aria-current={active ? "step" : undefined}
                >
                  <span className="journey__dot">{done ? <CheckIcon /> : null}</span>
                  <span className="journey__label">
                    {item.label}
                    {done ? <span className="visually-hidden">, completed</span> : null}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
        <p className="journey__now" aria-hidden="true">
          {caption}
        </p>
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
