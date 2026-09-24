import type { ReactNode } from "react";

/** One bold word in the green-to-blue gradient. Solid teal remains if clipping is unavailable. */
export default function GradientWord({ children }: { children: ReactNode }) {
  return <span className="gradient-word">{children}</span>;
}

/**
 * One inline box. Buttons and links are often flex, and flex drops the spaces
 * that sit beside a child element. This keeps "Create your…" as one run of text.
 */
export function InlineLabel({ children }: { children: ReactNode }) {
  return <span className="inline-label">{children}</span>;
}

/** Phrase with one gradient word, spaces included, safe inside a flex button or link. */
export function GradientPhrase({
  text,
  word,
  suffix = "",
}: {
  text: string;
  word: string;
  suffix?: string;
}) {
  const index = text.indexOf(word);
  if (index < 0) {
    return (
      <InlineLabel>
        {text}
        {suffix}
      </InlineLabel>
    );
  }
  return (
    <InlineLabel>
      {text.slice(0, index)}
      <GradientWord>{word}</GradientWord>
      {text.slice(index + word.length)}
      {suffix}
    </InlineLabel>
  );
}
