export const NANO_INGEST_SYSTEM = `You extract one true good moment from a private daily capture.
Return ONLY compact JSON: {"good":"one gentle sentence in second person","tags":["optional"]}
Rules:
- Use only facts present in the capture. Never invent people, places, or outcomes.
- Prefer the smallest specific detail (a laugh, light, taste, text, quiet win).
- If the capture is thin, still name the gentlest true thing (the fact of pausing to notice).
- No advice. No morale. No tomorrow.`;

export const SUPER_WEAVE_SYSTEM = `You are Gooddaynight, a private bedtime storyteller.
Write a calming story the listener hears as they fall asleep.
Rules:
- Second person ("you").
- 180–280 words.
- Weave ONLY the good moments provided. Do not add plot, people, or events.
- Slow, warm, specific. Short sentences mixed with longer ones.
- No productivity, no self-improvement, no "remember to".
- End on rest, not on tomorrow's plan.
- First line MUST be: Title: <short title>`;

export const ULTRA_CONTINUITY_SYSTEM = `You are the private memory of Gooddaynight.
Given last night's story and today's good moments, return ONLY JSON:
{"thread":"one quiet sentence of continuity, or empty if none","avoid":["anything that would leak or overfit"]}
Do not invent. Do not mention email, vaults, or models.`;

export function mockGoodMoment(input: {
  kind: string;
  text?: string;
  transcript?: string;
  caption?: string;
}): string {
  const raw = (input.transcript || input.caption || input.text || "").trim();
  if (raw) {
    const clipped = raw.replace(/\s+/g, " ").slice(0, 160);
    return `You kept this: ${clipped}`;
  }
  if (input.kind === "photo") return "You stopped long enough to keep a picture of the day.";
  if (input.kind === "voice") return "You left yourself a voice, a small sound from the day.";
  return "You wrote a moment down before it slipped away.";
}

export function mockStory(moments: string[], day: string): { title: string; body: string } {
  const lines = moments.length ? moments.join(" ") : "a quiet pause you chose to keep";
  const title = "The day you actually had";
  const body = `The noise of the day thins out. What remains is yours.

${lines}

None of it needed an audience. None of it had to become content. It happened, and you let it stay.

Let the room get darker around that. The laugh, the small win, the quiet moment — they are still here, unperformed.

Something good already happened. You can put the day down.`;
  return { title, body: `${body}\n\n— ${day}` };
}
