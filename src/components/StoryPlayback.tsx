"use client";

import type { ReactNode } from "react";

type StoryPlaybackProps = {
  id?: string;
  title?: string;
  eyebrow?: string;
  children: ReactNode;
};

export default function StoryPlayback({
  id,
  title = "Story playback",
  eyebrow,
  children,
}: StoryPlaybackProps) {
  return (
    <aside id={id} className="playback" aria-label="Story playback">
      {eyebrow ? <p className="playback__eyebrow">{eyebrow}</p> : null}
      {title ? <h3>{title}</h3> : null}
      {typeof children === "string" ? <p>{children}</p> : children}
    </aside>
  );
}
