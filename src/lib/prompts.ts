export const NANO_INGEST_SYSTEM = `You extract one true good moment from a private daily capture.
Return ONLY compact JSON: {"good":"one warm joyful sentence","tags":["optional"]}
Rules:
- Use only facts present in the capture. Never invent people, places, or outcomes.
- If there is a voice transcript or note, KEEP their exact wording and emotional charge (happy, cares, glad, a friend). Near-quote them. Never flatten a vivid line into a cooler narrator summary.
- Never replace a rich transcript with a vague "you left a voice" or "a small sound".
- Prefer the smallest specific detail they named (a laugh, a friend's enquiry, someone cares, light, taste).
- If the capture is thin, still keep the words they gave.
- No advice. No morale. No tomorrow. No bleakness. No "not as a task" or other negation-as-reassurance.`;

export const SUPER_WEAVE_SYSTEM = `You are Gooddaynight, a private bedtime storyteller.
Write a joyful, uplifting, emotionally warm story the listener hears as they float into sleep.
Strong feeling, soft delivery: a smile in the chest, never a hype yell, never calm-clinical.

Rules:
- Second person ("you") around their words — their sentence stays the brightest thing in the story.
- 180–280 words.
- LEAD with their exact good moment. Quote or near-quote their words early, linger on them, and return to them. Light golden threads only — never replace their sentence with a weaker paraphrase. If they said they felt happy a friend enquired how they are doing, someone cares — those words must shine, un-diluted.
- Do not add people, plots, or events that are not in the moments.
- Tone: glad, tender, glowing. The listener should feel the joy they named.
- Ban bleak or empty imagery: "darker", "the noise of the day thins", void, emptiness, hollow, unperformed, nobody, "put the day down" as gloom.
- Ban bland narrator filler that could have been anyone's day. Ban productivity framing, self-improvement, "remember to", to-do language.
- Ban negation-as-reassurance: "not as a task", "not a to-do", "not a chore", "not something you have to", "just as something true" after a not-clause. Do not apologize for the feeling.
- End by gently floating into slumber with the sense that returning to this good unfolds it, then unfolds it again — multifold. Honour the spirit of: "With time, naturally your own good moments unfolds — your own good moments multifolds." Soft, wonder-struck, never preachy, never advice.
- First line MUST be: Title: <short title that reflects THEIR moment>`;

export const ULTRA_CONTINUITY_SYSTEM = `You are the private memory of Gooddaynight.
Given last night's story and today's good moments, return ONLY JSON:
{"thread":"one quiet warm sentence of continuity, or empty if none","avoid":["anything that would leak or overfit"]}
Do not invent. Do not mention email, vaults, or models. Keep the tone gentle, never bleak.`;

export const EMPTY_VOICE_HINT =
  "You left yourself a voice, a small sound from the day.";

const EMPTY_VOICE_RE =
  /small sound from the day|left yourself a voice|saved a moment with no extra words|a quiet pause you chose to keep/i;

export const WEAVE_NEEDS_WORDS =
  "Add a line about what you said — a voice without words isn't enough to tell your story.";

export function spokenWords(input: {
  text?: string;
  transcript?: string;
  caption?: string;
  goodMoment?: string;
}): string {
  return (input.transcript || input.caption || input.text || "").trim();
}

export function isEmptyVoicePlaceholder(value: string | undefined): boolean {
  if (!value?.trim()) return true;
  return EMPTY_VOICE_RE.test(value);
}

export function isWeavableMoment(input: {
  text?: string;
  transcript?: string;
  caption?: string;
  goodMoment?: string;
}): boolean {
  const spoken = spokenWords(input);
  if (spoken.length >= 8 && !isEmptyVoicePlaceholder(spoken)) return true;
  const good = (input.goodMoment || "").trim();
  return good.length >= 8 && !isEmptyVoicePlaceholder(good);
}

export function weavableLines(captures: Array<{
  text?: string;
  transcript?: string;
  caption?: string;
  goodMoment?: string;
}>): string[] {
  const lines: string[] = [];
  for (const capture of captures) {
    if (!isWeavableMoment(capture)) continue;
    const spoken = spokenWords(capture);
    const good = (capture.goodMoment || "").trim();
    if (spoken && !isEmptyVoicePlaceholder(spoken)) lines.push(spoken);
    else if (good && !isEmptyVoicePlaceholder(good)) lines.push(good);
  }
  return lines;
}

export function mockGoodMoment(input: {
  kind: string;
  text?: string;
  transcript?: string;
  caption?: string;
}): string {
  const raw = spokenWords(input);
  if (raw) {
    const clipped = raw.replace(/\s+/g, " ").slice(0, 240);
    return clipped.replace(/^[a-z]/, (ch) => ch.toUpperCase());
  }
  if (input.kind === "photo") return "You stopped long enough to keep a picture of the day.";
  if (input.kind === "voice") return EMPTY_VOICE_HINT;
  return "You wrote a moment down before it slipped away.";
}

export function mockStory(moments: string[], day: string): { title: string; body: string } {
  const concrete = moments
    .map((moment) => moment.replace(/\s+/g, " ").trim())
    .filter((moment) => moment && !isEmptyVoicePlaceholder(moment));

  if (!concrete.length) {
    return {
      title: "Your words, when you're ready",
      body: `${WEAVE_NEEDS_WORDS}\n\n— ${day}`,
    };
  }

  const quoted = concrete.map((moment) => moment.replace(/\.$/, "")).join(". ");
  const title = titleFromMoments(concrete);
  const linger = lingerOnWords(quoted);
  const glow = glowFromMoments(quoted);
  const body = `There it is — the brightest thing from your day, in your own voice. Stay with it.

${quoted}.

Hear it again, the way you said it. ${quoted}.

${linger}

${glow}

That gladness can live in the chest like a quiet smile — warm, sure, a little shine under the ribs. The room stays soft and the feeling stays strong. Joy, held gently. This feeling is yours.

How glad that lands. The happiness you named glows a little brighter each time you hear your own line.

Float toward sleep with those words still close. Returning to this good lets it open, then open again. With time, naturally, your own good moments unfold — your own good moments multifold.

Rest inside the line you kept. A smile in the chest. The good, still bright. Yours.`;

  return { title, body: `${body}\n\n— ${day}` };
}

function lingerOnWords(quoted: string): string {
  const skip = new Set([
    "that",
    "this",
    "with",
    "from",
    "have",
    "felt",
    "just",
    "about",
    "doing",
    "someone",
    "myself",
    "there",
    "their",
    "them",
    "your",
    "you",
  ]);
  const pieces = quoted
    .replace(/[.,!?]/g, " ")
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length > 3 && !skip.has(word.toLowerCase()));
  const unique: string[] = [];
  for (const word of pieces) {
    const key = word.toLowerCase();
    if (unique.some((kept) => kept.toLowerCase() === key)) continue;
    unique.push(word);
    if (unique.length === 6) break;
  }
  if (!unique.length) {
    return "The joy is already in those words. They are still yours, still bright.";
  }
  const lifted = unique
    .map((word) => word.replace(/^[a-z]/, (ch) => ch.toUpperCase()))
    .join(". ");
  return `${lifted}. The joy is already in those words — still yours, still bright.`;
}

function glowFromMoments(quoted: string): string {
  const joined = quoted.toLowerCase();
  if (/friend/.test(joined) && /care|enquir|ask|check|contact|how (am i|you)/.test(joined)) {
    return "A friend reached toward you. The question was simple and it landed as care. Happiness, real and specific — someone cares about you.";
  }
  if (/friend/.test(joined)) {
    return "A friend thought of you. That warmth can stay bright in the room with you.";
  }
  if (/happy|glad|joy|smile/.test(joined)) {
    return "The happiness you named can stay bright, simple, and true.";
  }
  return "The exact good you named can stay bright in the room with you.";
}

function titleFromMoments(moments: string[]): string {
  const joined = moments.join(" ").toLowerCase();
  if (/friend/.test(joined) && /care/.test(joined)) {
    return "Someone cares about you";
  }
  if (/friend/.test(joined) && /check|text|ask|contact|enquir|how (am i|you)/.test(joined)) {
    return "A friend checked in";
  }
  if (/friend/.test(joined)) return "The friend who thought of you";
  if (/happy|glad|joy|smile/.test(joined)) return "The happiness you kept";
  return "The good that found you";
}
