import type { ReactNode } from "react";

/** One bold word in the green-to-blue gradient. Solid teal remains if clipping is unavailable. */
export default function GradientWord({ children }: { children: ReactNode }) {
  return <span className="gradient-word">{children}</span>;
}
