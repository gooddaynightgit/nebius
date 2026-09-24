"use client";

import type { ReactNode } from "react";
import { LANDING } from "@/lib/landing";

type StoryPlaybackProps = {
  id?: string;
  title?: string;
  eyebrow?: string;
  /** Line under the heading, inside the pastel banner. Joy page only. */
  lead?: string;
  /** Dark email-style card. Landing keeps the plain lavender box. */
  variant?: "plain" | "weaved";
  children: ReactNode;
};

export default function StoryPlayback({
  id,
  title = LANDING.moment.playbackTitle,
  eyebrow,
  lead,
  variant = "plain",
  children,
}: StoryPlaybackProps) {
  const story = typeof children === "string" ? <p className="playback__story">{children}</p> : children;
  if (variant === "weaved") {
    return (
      <aside
        id={id}
        className="playback playback--weaved"
        aria-label={title || LANDING.moment.playbackTitle}
      >
        <div className="playback__banner">
          {title ? <h3>{title}</h3> : null}
          {lead ? <p className="playback__lead">{lead}</p> : null}
        </div>
        {story}
      </aside>
    );
  }
  return (
    <aside id={id} className="playback" aria-label={title || LANDING.moment.playbackTitle}>
      {eyebrow ? <p className="playback__eyebrow">{eyebrow}</p> : null}
      {title ? <h3>{title}</h3> : null}
      {story}
    </aside>
  );
}
