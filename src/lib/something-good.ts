/** Something Good: the same words the Alexa skill speaks, shared with the web version. */

export const SG_PATH = "/something-good";
export const SG_HEADLINE = "Name what you're not grateful for";
export const SG_BUTTON = "Start";
export const SG_SUPPORT = "Support to help you create what you want.";
export const SG_DESCRIPTION =
  "Name what you're not grateful for. A gentle voice walks you through a breath, three simple thank-yous, and one hopeful line: something good is about to happen.";

export const SG_BLOCKS = [
  "A challenge",
  "A situation",
  "Something missing",
  "Something you want to change",
] as const;

export const SG_WELCOME =
  "Welcome. I'm so glad you're here. This is the place to name what you're not grateful for. And here's the good news: you don't have to carry it alone. I'm here to help you find the good that's waiting inside it.";

export const SG_BREATH = "Let's begin with a deep breath together. Breathe in… and out.";

export const SG_QUESTION =
  "Right at this moment, tell me: what challenge or situation are you dealing with? Or is there something you'd like to change, or something missing in your life?";

export const SG_BASICS = [
  "First, something simple. A cup of tea, or a warm bed tonight. Thank you for that.",
  "Now a person. Someone who smiled at you, or called. Thank you for them.",
  "And one more. A meal, clean water, being alive today. Thank you for that.",
] as const;

export const SG_BREATHE_TOGETHER = "Let's breathe together. Breathe in… and out.";

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
