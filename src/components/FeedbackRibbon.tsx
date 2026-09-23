import { FEEDBACK_LINES, FEEDBACK_PREFIX } from "@/lib/feedback";

function FeedbackLine({ line }: { line: string }) {
  const rest = line.startsWith(FEEDBACK_PREFIX) ? line.slice(FEEDBACK_PREFIX.length) : line;
  return (
    <span className="feedback-ribbon__item">
      <span className="feedback-ribbon__label">{FEEDBACK_PREFIX}</span>
      {rest}
    </span>
  );
}

function FeedbackGroup({ hidden = false }: { hidden?: boolean }) {
  return (
    <div className="feedback-ribbon__group" aria-hidden={hidden || undefined}>
      {FEEDBACK_LINES.map((line) => (
        <FeedbackLine key={line} line={line} />
      ))}
    </div>
  );
}

export default function FeedbackRibbon() {
  return (
    <aside className="feedback-ribbon" aria-label="Feedback">
      <div className="feedback-ribbon__track">
        <FeedbackGroup />
        <FeedbackGroup hidden />
      </div>
    </aside>
  );
}
