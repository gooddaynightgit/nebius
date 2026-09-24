import Link from "next/link";

/**
 * Round step button. The visible words are the progress-bar label for this
 * step (forward) or the previous step (back).
 */
export default function StepControl({
  direction,
  label,
  href,
  disabled = false,
}: {
  direction: "back" | "next";
  label: string;
  href?: string;
  disabled?: boolean;
}) {
  const className = direction === "next" ? "step-next" : "step-back";
  const name = direction === "next" ? `Next: ${label}` : `Back: ${label}`;

  if (disabled || !href) {
    return (
      <button className={className} type="button" disabled aria-label={name}>
        {label}
      </button>
    );
  }

  return (
    <Link className={className} href={href} aria-label={name}>
      {label}
    </Link>
  );
}
