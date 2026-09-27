import Link from "next/link";

/** Round navy button with a lime arrow, in the page flow above the footer. */
export default function BackToStart() {
  return (
    <Link className="step-back-arrow" href="/" aria-label="Back to start">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M19 12H6M11 6 5 12l6 6"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </Link>
  );
}
