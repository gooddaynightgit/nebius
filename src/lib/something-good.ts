/** Something Good: the same words the Alexa skill speaks, shared with the web version. */

export const SG_PATH = "/something-good";
export const SG_HEADLINE = "Name what you're not grateful for";
export const SG_BUTTON = "Start";
export const SG_SUPPORT = "Support to lead you to something good.";
export const SG_DESCRIPTION =
  "Name what you're not grateful for. A gentle voice guides one slow breath, then says your own words back with one hopeful line: something good is about to happen.";

export type SgFocus = "challenge" | "situation" | "missing" | "change" | "else";

/** The five choices on the start screen; `focus` shapes the question the server asks. */
export const SG_OPTIONS: { focus: SgFocus; label: string }[] = [
  { focus: "challenge", label: "A challenge" },
  { focus: "situation", label: "A situation" },
  { focus: "missing", label: "Something missing" },
  { focus: "change", label: "Something you want to change" },
  { focus: "else", label: "Something else" },
];

export const SG_CHOOSE_FIRST = "Please choose the one that feels closest, then tap Start.";

export const SG_WELCOME =
  "Welcome. I'm so glad you're here. This is the place to name what you're not grateful for. And here's the good news: you don't have to carry it alone. I'm here to help you find the good that's waiting inside it.";

/** One guided breath: Alexa guides, it never claims to breathe with you. */
export const SG_BREATH_FIRST = "Let's start with one slow, deep breath.";
export const SG_BREATH_TWO = "Let's take two more slow breaths.";
export const SG_BREATH_IN = "Breathe in slowly…";
export const SG_BREATH_HOLD = "Hold it gently…";
export const SG_BREATH_RELEASE = "Slowly release…";
export const SG_BREATH_LET_GO = "just let it go.";
export const SG_TAKE_TIME = "Take your time. There's no rush.";

/** Seconds: in 4, hold 2, out 7 (the long out-breath is the letting go). */
export const SG_BREATH_MS = { in: 4000, hold: 2000, out: 7000 } as const;

export const SG_QUESTION =
  "Right at this moment, tell me: what challenge or situation are you dealing with? Or is there something you'd like to change, or something missing in your life?";

export const SG_BASICS = [
  "First, something simple. A cup of tea, or a warm bed tonight. Thank you for that.",
  "Now a person. Someone who smiled at you, or called. Thank you for them.",
  "And one more. A meal, clean water, being alive today. Thank you for that.",
] as const;


export const SG_CLOSE = "It's going to be alright. All is well. Something good is about to happen.";

/** Turn what the person typed into the words after "with". Never claims it is solved. */
export function sgSubject(raw: string): string {
  const text = raw.trim().replace(/\s+/g, " ").replace(/[.!?]+$/, "");
  if (!text) return "what you named";
  const lowered = /^[A-Z][a-z]/.test(text) && !/^I\b/.test(text) ? text[0].toLowerCase() + text.slice(1) : text;
  return lowered.replace(/\bmy\b/gi, "your").replace(/\bmine\b/gi, "yours");
}

export function sgThankYou(raw: string): string {
  return `Thank you. Something good is about to happen with ${sgSubject(raw)}.`;
}
