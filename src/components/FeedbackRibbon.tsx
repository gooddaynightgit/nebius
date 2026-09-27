"use client";

import { usePathname } from "next/navigation";
import { FEEDBACK_LINES } from "@/lib/feedback";
import { isGuidePath } from "@/lib/guide-pages";

function FeedbackLine({ quote, attribution }: { quote: string; attribution: string }) {
  return (
    <span className="feedback-ribbon__item">
      <span className="feedback-ribbon__quote">{quote}</span>
      <span className="feedback-ribbon__label">{attribution}</span>
    </span>
  );
}

function FeedbackGroup({ hidden = false }: { hidden?: boolean }) {
  return (
    <div className="feedback-ribbon__group" aria-hidden={hidden || undefined}>
      {FEEDBACK_LINES.map((line) => (
        <FeedbackLine key={line.quote} quote={line.quote} attribution={line.attribution} />
      ))}
    </div>
  );
}

export default function FeedbackRibbon() {
  const pathname = usePathname();
  if (isGuidePath(pathname)) return null;
  return (
    <aside className="feedback-ribbon" aria-label="Feedback">
      <div className="feedback-ribbon__track">
        <FeedbackGroup />
        <FeedbackGroup hidden />
      </div>
    </aside>
  );
}
