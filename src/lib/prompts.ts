export const NANO_INGEST_SYSTEM = `You extract one true good moment from a private daily capture.
Return ONLY compact JSON: {"good":"one warm sentence in second person","tags":["optional"]}
Rules:
- Use only facts present in the capture. Never invent people, places, or outcomes.
- If there is a voice transcript or note, KEEP its specifics (who, what they said, the feeling). Never replace a rich transcript with a vague "you left a voice" or "a small sound".
- Prefer the smallest specific detail (a laugh, a friend's text, light, taste, a quiet win).
- If the capture is thin, still name the gentlest true thing from the words they gave.
- No advice. No morale. No tomorrow. No bleakness.`;

export const SUPER_WEAVE_SYSTEM = `You are Gooddaynight, a private bedtime storyteller.
Write a warm, joyful-but-calm story the listener hears as they fall asleep.
Rules:
- Second person ("you").
- 180–280 words.
- MUST weave the listener's actual words and specifics. If they mentioned a friend checking in, happiness, a text — those facts must appear, in their own color, not as generic "a small win".
- Do not add people, plots, or events that are not in the moments.
- Tone: soft joy, safety, rest. Ban bleak or empty imagery: "darker", "the noise of the day thins", void, emptiness, hollow, unperformed, nobody, "put the day down" as gloom.
- No generic filler that could have been anyone's day. Every paragraph should touch their specific moment.
- No productivity, no self-improvement, no "remember to".
- End on rest and warmth — the good can stay with them as they sleep.
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
  const joined = quoted.toLowerCase();
  const friendNote = /friend/.test(joined)
    ? "A friend thought of you. That warmth can stay — not as a task, just as something true."
    : "Keep the warmth of those exact words — not as a task, just as something true.";
  const close = /friend|check|text|ask/.test(joined)
    ? "You can rest now, still glad they thought of you."
    : "You can rest now, still glad you kept this.";
  const body = `Tonight the good that happened is still here, close enough to hear.

You said it yourself: ${quoted}.

${friendNote}

Let that happiness sit in the room with you. Soft. Specific. Yours.

${close}`;

  return { title, body: `${body}\n\n— ${day}` };
}

function titleFromMoments(moments: string[]): string {
  const joined = moments.join(" ").toLowerCase();
  if (/friend/.test(joined) && /check|text|ask|contact|how you/.test(joined)) {
    return "A friend checked in";
  }
  if (/friend/.test(joined)) return "The friend who thought of you";
  if (/happy|glad|joy|smile/.test(joined)) return "The happiness you kept";
  return "The good that found you";
}
