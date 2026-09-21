import type { ReactNode } from "react";

type StoryPlaybackProps = {
  id?: string;
  title?: string;
  children: ReactNode;
};

export default function StoryPlayback({
  id,
  title = "Story playback",
  children,
}: StoryPlaybackProps) {
  return (
    <aside id={id} className="playback" aria-label="Story playback">
      <h3>{title}</h3>
      {typeof children === "string" ? <p>{children}</p> : children}
    </aside>
  );
}
