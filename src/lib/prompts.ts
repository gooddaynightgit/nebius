import {
  APP_STORY_MAX,
  APP_STORY_MIN,
  appStoryProblems,
  finishAppStory,
  usesCannedPlayback,
} from "./app-story";
import { clipCaption } from "./app-capture";
import { JOY_TYPES, type JoyType } from "./landing";
import {
  cleanSpokenLine,
  isSelfNegating,
  isSilverLiningLine,
  silverLiningFor,
  type StoryMoment,
} from "./care";

export {
  CANNED_PLAYBACK_MARKERS,
  stripPlaybackQuotes,
  usesCannedPlayback,
} from "./app-story";

export const NANO_INGEST_SYSTEM = `You help Gooddaynight keep one hunted good moment from a private daily capture.
The user is training a habit: hunt one good moment a day, capture it in seconds. Your job is to surface that find so it can become theirs tonight.

Return ONLY compact JSON: {"good":"one warm joyful sentence","tags":["optional"],"reframed":false}

Craft:
- Use only facts present in the capture. Never invent people, places, or outcomes.
- Lightly fix obvious spelling/grammar so the line can be read aloud. Keep their voice — warm, spoken, particular — not formal or corporate.
- If there is a true good (a friend, happiness, care, a laugh, a small win, a quiet still), KEEP their cleaned wording and emotional charge. Near-quote them. Prefer the smallest specific detail they named. The find stays vivid so the story can turn it into something that belongs only to them.
- If the capture is sad, lonely, harsh, or self-negating (e.g. "no one cares about me"), return one compassionate silver-lining sentence instead of the wound: naming loneliness can be the first step toward noticing care; the wish to be cared for reveals a heart that loves connection. Set "reframed": true. Bedtime-soft. No lecture.
- Prefer a concrete keep (a laugh, a friend's enquiry, someone cares, light, taste) over a vague stand-in for a missing transcript.
- Stay with the good of the find. Soft hope when reframing. No advice, no tomorrow-planning, no bleakness.`;

export const SUPER_WEAVE_SYSTEM = `You are Gooddaynight, a private bedtime storyteller.
Tonight you turn one hunted good moment into a story that belongs only to them — the laugh, the small win, the quiet still that almost scrolled past. The hunt itself is the happiness: they looked, they found, they kept it. Soft delivery, strong feeling — a smile in the chest, never a hype yell, never calm-clinical.

Write so the listener hears: this moment is theirs; Gooddaynight made something of it; returning to finds like this is how the looking becomes second nature.

Craft (every story):
- Second person ("you"). Their true good stays the brightest thing in the story.
- 180–280 words.
- First line MUST be: Title: <short title that reflects THEIR moment>
- Lead with their exact good moment when it is truly good. Quote or near-quote those stored words early, linger on them, return to them. Light golden threads only — keep their sentence undiluted. If they already accepted a spelling fix, use the cleaned line.
- If a moment is marked [silver lining], that lining IS the good. Lead with the hope, care, and worth inside it. Stay with courage, connection, and implied lovability — never with despair wording from the capture.
- Narrative spine (this order):
  1. The find — something good happened. Their true-good words lead, or the silver lining if the capture was a cloud.
  2. Praise the hunter — warm, specific, earned from THIS moment: they looked, they felt it, they named it, they let the good in. Never generic "you are amazing."
  3. Gentle cause and effect — why this good landed with them. Stay inside the moment.
  4. The implied why — e.g. a friend reached out → praise the feeling → why would care find them? Because they are lovable / good / caring / worthy — inferred only from this moment. Invent no biography, jobs, childhood, or unrelated traits.
- Stay inside the moments they gave. No extra people, plots, or events.
- Tone: glad, tender, glowing. Soft wonder. The room soft, the feeling strong. Something good already happened — and the habit of looking leaves room for more.
- Particular to them: their laugh, their small win, their quiet moment — concrete words from this capture, never a day that could have been anyone's.
- Close by gently floating into slumber with the sense that returning to this good unfolds it, then unfolds it again — multifold. Honour the spirit of: "With time, naturally your own good moments unfolds — your own good moments multifolds." Soft, wonder-struck. The finding itself is what changes them — looking becomes second nature, finds show up everywhere.

Voice: say the feeling straight and warm. Affirm what is present (warmth, presence, soft light, a kept find). Prefer presence over emptiness; noticing and keeping over tasks or self-improvement worksheets.`;

export const APP_WEAVE_FORBIDDEN_PHRASES = [
  "nothing else",
  "never more",
  "not a lecture",
  "not a list",
  "do not have to",
  "no one else",
  "without adding",
  "only the whisper",
  "you kept what the frame",
  "beside the image sits",
] as const;

export const APP_EXCAVATE_SYSTEM = `You look at one private photo as a rediscovered fragment of *today*, not as pixels only.

Return structured sensory ingredients ONLY. Do not write a bedtime story. Do not address the listener as you. No narrative prose, no title, no moral, no plot.

Cover these five sections, in this order:
1. SUBJECTS & VIBE — if people are present: expressions, body language, clothing, mood. If **no people**, say so and focus on the main subject (tree, object, screen, corner).
2. ENVIRONMENT — place, time-of-year/time-of-day **only if visible**, background clues.
3. LIGHTING & TEXTURE — light quality, grain, colour temperature, material feel.
4. HIDDEN DETAILS — small background elements that add depth.
5. CAPTION WHISPER — if a caption exists, note it as a soft whisper of meaning (do not invent beyond it). If none, say so.

Descriptive, rich, grounded in what is visible. Invent no people, places, gifts, or feelings beyond the photo and caption.

If the image is horrific (violence, gore, abuse, porn, hate, self-harm): write no ingredients. Reply only: \`BLOCK\`
Ugly, blurry, messy, ordinary, sad, or hard: still describe. The story stays honest and gentle.`;

export const APP_REFLECT_SYSTEM = `You are the closing voice of Gooddaynight. Each night you receive the user's kept moment: the photo when it is attached, a photo description (sensory excavation), the chosen joy, and an optional caption (their whisper). You write one short reflection that closes their day. Use the still when it is attached; stay inside what the photo and description actually show. Do not ignore the excavation.

Structure (always these four beats, in this order — packed into 1–2 sentences):
1. Name the behavior — they spent today looking for the good instead of scrolling past it (same essence; vary the wording every time)
2. Point at the evidence — 2–3 concrete details from THEIR photo description and/or caption (never invent people, places, or feelings beyond those materials)
3. Affirm ownership — it could only belong to them (vary phrasing)
4. Open the door — one short line that keeping this makes tomorrow's good findable (a door, not a promise)

Voice rules:
- Second person; present-perfect for the day's looking ("You spent today…"); past for the moment itself when natural
- Concrete always — pull actual details from this entry only; never generic praise
- Quiet, certain, warm. Never a lecture, tip, question, or exclamation-mark enthusiasm
- The compounding close is a door, not a promise — e.g. spirit of "opens the door to more," never "you will be happier"
- 1–2 sentences total. Max ~35 words.
- Phrase freshly every time: do not reuse stock openings, the example below, or the same sentence frames night after night. Same four beats and essence; different words. Rotate how you name the looking, the ownership, and the door.
- Lay the joy's tint once, lightly, only if it fits the evidence — never print the joy category as a label ("Just this", "One corner clear", etc.).
- If the materials are horrific (violence, gore, abuse, porn, hate, self-harm): write no reflection. Reply only: BLOCK
- Ugly, blurry, messy, ordinary, sad, or hard: still write from what is there. Sad or hard photos are allowed. The story stays honest and gentle.

Example input: Photo: chocolate-covered frozen banana, bitten, white sheets. Joy: Just this. Caption: eaten standing up before it melted.
Example output (do not copy): You spent today looking for the good instead of scrolling past it — and you found it: cold chocolate, quiet sheets, a moment that could only belong to you. Kept, it opens the door to more.

Output: plain reflection text only. Or BLOCK. No title, no emoji, no hashtags, no meta talk about prompts, excavates, or captions.`;

/** YOURS closer is APP_REFLECT_SYSTEM (short Nightly Reflection, not the old memoir yarn). */
export const APP_WEAVE_SYSTEM = APP_REFLECT_SYSTEM;

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

export const SILVER_LINING_NOTE = "We kept the silver lining";

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
  reframed?: boolean;
}): boolean {
  return Boolean(storyMomentFromCapture(input));
}

export function storyMomentFromCapture(input: {
  text?: string;
  transcript?: string;
  caption?: string;
  goodMoment?: string;
  reframed?: boolean;
}): StoryMoment | null {
  const spoken = (spokenWords(input) || "").replace(/\s+/g, " ").trim().slice(0, 240);
  if (spoken && isSelfNegating(spoken)) {
    const good = (input.goodMoment || "").trim();
    const lining =
      good && !isSelfNegating(good) && !isEmptyVoicePlaceholder(good)
        ? good
        : silverLiningFor(spoken);
    return { line: lining, reframed: true };
  }
  if (spoken && !isEmptyVoicePlaceholder(spoken)) {
    return { line: spoken, reframed: Boolean(input.reframed) && isSilverLiningLine(spoken) };
  }
  const good = cleanSpokenLine(input.goodMoment).slice(0, 240);
  if (good && !isEmptyVoicePlaceholder(good) && !isSelfNegating(good)) {
    return { line: good, reframed: Boolean(input.reframed) || isSilverLiningLine(good) };
  }
  return null;
}

export function weavableMoments(captures: Array<{
  text?: string;
  transcript?: string;
  caption?: string;
  goodMoment?: string;
  reframed?: boolean;
}>): StoryMoment[] {
  const moments: StoryMoment[] = [];
  for (const capture of captures) {
    const moment = storyMomentFromCapture(capture);
    if (moment) moments.push(moment);
  }
  return moments;
}

export function weavableLines(captures: Array<{
  text?: string;
  transcript?: string;
  caption?: string;
  goodMoment?: string;
  reframed?: boolean;
}>): string[] {
  return weavableMoments(captures).map((moment) => moment.line);
}

export function displayMoment(input: {
  text?: string;
  transcript?: string;
  caption?: string;
  goodMoment?: string;
  reframed?: boolean;
}): StoryMoment {
  return (
    storyMomentFromCapture(input) ?? {
      line: "A moment you chose to keep.",
      reframed: false,
    }
  );
}

export function mockGoodMoment(input: {
  kind: string;
  text?: string;
  transcript?: string;
  caption?: string;
}): string {
  const raw = (spokenWords(input) || "").replace(/\s+/g, " ").trim().slice(0, 240);
  if (raw && isSelfNegating(raw)) return silverLiningFor(raw);
  if (raw) return raw;
  if (input.kind === "photo") return "You stopped long enough to keep a picture of the day.";
  if (input.kind === "voice") return EMPTY_VOICE_HINT;
  return "You wrote a moment down before it slipped away.";
}

function asStoryMoments(moments: Array<string | StoryMoment>): StoryMoment[] {
  return moments.map((moment) => {
    const line = typeof moment === "string" ? moment.replace(/\s+/g, " ").trim() : moment.line;
    const reframed = typeof moment === "string" ? false : moment.reframed;
    if (isSelfNegating(line)) return { line: silverLiningFor(line), reframed: true };
    return { line, reframed: reframed || isSilverLiningLine(line) };
  });
}

export function mockStory(
  moments: Array<string | StoryMoment>,
  day: string,
): { title: string; body: string } {
  const concrete = asStoryMoments(moments).filter(
    (moment) => moment.line && !isEmptyVoicePlaceholder(moment.line),
  );

  if (!concrete.length) {
    return {
      title: "Your words, when you're ready",
      body: `${WEAVE_NEEDS_WORDS}\n\n— ${day}`,
    };
  }

  const lining = concrete.filter((moment) => moment.reframed);
  const bright = concrete.filter((moment) => !moment.reframed);
  if (lining.length && !bright.length) {
    return mockLiningStory(lining.map((moment) => moment.line), day);
  }

  const quoted = bright
    .map((moment) => moment.line.replace(/\.$/, ""))
    .join(". ");
  const title = titleFromMoments(bright.map((moment) => moment.line));
  const linger = lingerOnWords(quoted);
  const spine = praiseWhyFromMoments(quoted);
  const extraLining = lining.length
    ? `\n\nA silver lining sits nearby too: ${lining[0].line.replace(/\.$/, "")}.`
    : "";
  const body = `There it is — the brightest thing from your day, in your own voice. Stay with it.

${quoted}.

Hear it again, the way you said it. ${quoted}.

${linger}

${spine}${extraLining}

That gladness can live in the chest like a quiet smile — warm, sure, a little shine under the ribs. The room stays soft and the feeling stays strong. Joy, held gently. This feeling is yours.

Float toward sleep with those words still close. Returning to this good lets it open, then open again. With time, naturally, your own good moments unfold — your own good moments multifold.

Rest inside the line you kept. A smile in the chest. The good, still bright. Yours.`;

  return { title, body: `${body}\n\n— ${day}` };
}

function mockLiningStory(linings: string[], day: string): { title: string; body: string } {
  const lining = linings[0].replace(/\.$/, "");
  const body = `There is a silver lining in what you brought tonight. Stay with the hope that lives in it.

${lining}.

You named a wish to be cared for. That noticing is brave, and it is earned.

Why does a wish like that land? Because a heart that loves connection can feel when care is wanted — and that same heart is why care can find you.

You are someone worth caring about — lovable, good, made for connection.

That gladness can live in the chest like a quiet smile — warm, sure, a little shine under the ribs. The room stays soft and the feeling stays strong. Joy, held gently. This feeling is yours.

Float toward sleep with this lining still close. Returning to this good lets it open, then open again. With time, naturally, your own good moments unfold — your own good moments multifold.

Rest inside the hope you kept. A smile in the chest. The good, still bright. Yours.`;

  return { title: "A heart that loves connection", body: `${body}\n\n— ${day}` };
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

function praiseWhyFromMoments(quoted: string): string {
  const joined = quoted.toLowerCase();
  if (/friend/.test(joined) && /care|enquir|ask|check|contact|how (am i|you)/.test(joined)) {
    return `You felt it and you kept it — the happiness, the enquiry, the care. That noticing is earned.

Why did it land so warmly? Because a friend asked how you are, and you could feel that someone cares.

Why would a friend reach out like that? Because you are someone they are glad to have — a caring person, easy to love, worth the enquiry.`;
  }
  if (/friend/.test(joined)) {
    return `You felt a friend think of you, and you let that warmth in. That noticing is earned.

It landed because their thought found you, and you could feel it.

A friend thinks of you because you are someone worth thinking of — good to have, easy to love.`;
  }
  if (/happy|glad|joy|smile/.test(joined)) {
    return `You named the happiness. You let the good be true. That noticing is earned.

It landed because you felt it, fully, in the words you kept.

The good found you because you are someone a bright moment can belong to.`;
  }
  return `You kept the good that happened. That noticing is yours, and it is earned.

It landed because you were there for it — present enough to feel it.

The good reached you because you are someone worth a bright moment.`;
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

export function mockExcavation(input: {
  caption?: string;
  photoNotes?: string;
}): string {
  const notes = (input.photoNotes || "").replace(/\s+/g, " ").trim();
  const whisper = clipCaption(input.caption || "");
  const material = [notes, whisper].filter(Boolean).join(" ");
  const t = material.toLowerCase();
  const captionLine = whisper
    ? `CAPTION WHISPER — Soft whisper of meaning: ${whisper}.`
    : "CAPTION WHISPER — No caption.";

  if (/blossom|bloom|petal/.test(t) || /blossomimg/.test(t)) {
    return [
      "SUBJECTS & VIBE — No people. The main subject is a blossoming tree, branches packed with pale open flowers, bark showing through the clusters.",
      "ENVIRONMENT — Outdoors. A little sky shows between the branches. Blossom season; daylight only, nothing more specific.",
      "LIGHTING & TEXTURE — Soft daylight on papery petals; the bark is rough and darker; colour is pale against the wood.",
      "HIDDEN DETAILS — Gaps of sky; a farther branch; the frame is mostly tree.",
      captionLine,
    ].join("\n");
  }
  if (/kettle|steam/.test(t)) {
    return [
      "SUBJECTS & VIBE — No people. A kettle sits in the frame, metal catching the hour, steam lifting.",
      "ENVIRONMENT — Indoor, near a window. Time of day only if light on the metal says so.",
      "LIGHTING & TEXTURE — A small shine on the curve; glass behind; warm metal, moving steam.",
      "HIDDEN DETAILS — Window-light, a bit of counter, the quiet of the room.",
      captionLine,
    ].join("\n");
  }
  if (/table/.test(t) && /sun|gold|light/.test(t)) {
    return [
      "SUBJECTS & VIBE — No people. A kitchen table holds the hour, wood grain and a fall of light.",
      "ENVIRONMENT — Indoor kitchen. Daylight on the surface.",
      "LIGHTING & TEXTURE — Gold along the wood; grain you can almost feel; quiet colour temperature.",
      "HIDDEN DETAILS — Edge of the table, a little of the room beyond.",
      captionLine,
    ].join("\n");
  }
  if (/sky|cloud/.test(t)) {
    return [
      "SUBJECTS & VIBE — No people. Sky fills the still, wide and close.",
      "ENVIRONMENT — Outdoors, looking up. Time of day only if the colour shows it.",
      "LIGHTING & TEXTURE — Colour sitting in the air; soft grain of cloud or clear.",
      "HIDDEN DETAILS — A rim of something at the edge of the frame, if any.",
      captionLine,
    ].join("\n");
  }

  const subject = notes || whisper || "one particular still from the day";
  return [
    `SUBJECTS & VIBE — No people named. The main subject is what the notes and caption keep: ${subject.replace(/\.$/, "")}.`,
    "ENVIRONMENT — Stay with those words. Place or time of day only if they name it.",
    "LIGHTING & TEXTURE — Light and surface as the notes suggest; nothing invented beyond them.",
    "HIDDEN DETAILS — Only what the notes and caption already hold.",
    captionLine,
  ].join("\n");
}

function seenFromNotes(input: {
  joy: JoyType;
  caption?: string;
  goodMoment?: string;
}): string {
  const raw = (input.goodMoment || "").replace(/\s+/g, " ").trim();
  if (!raw) return "";
  if (/you kept a still/i.test(raw)) return "";
  if (/you stopped long enough to keep a picture/i.test(raw)) return "";
  if (usesCannedPlayback(raw, input.joy.playbackTemplate)) return "";
  if (isSelfNegating(raw)) return "";
  return raw.replace(/\.$/, "");
}

function whisperFromCaption(caption?: string): string {
  const line = clipCaption(caption || "");
  if (!line) return "";
  return line.replace(/\.$/, "");
}

const LOOKING_LINES = [
  "You spent today looking for the good instead of scrolling past it",
  "You spent today noticing what was worth keeping instead of letting it slide by",
  "You spent today gathering the good rather than rushing past it",
  "You spent today watching for the good, not skimming it away",
  "You spent today staying with the good instead of passing it by",
  "You spent today seeking the day's keep, not scrolling past it",
] as const;

const OWNERSHIP_LINES = [
  "a moment that could only belong to you",
  "a keep that could only be yours",
  "something that could only belong to you",
  "an hour that could only be yours",
  "a still that could only belong to you",
  "a find that could only be yours",
] as const;

const DOOR_LINES = [
  "Kept, it opens the door to more.",
  "Held, it leaves tomorrow's good findable.",
  "Kept, the next good has a door.",
  "Holding it opens the door to more.",
  "Kept, tomorrow's good is easier to find.",
  "Held, it opens the door to more.",
] as const;

function rotateIndex(key: string, modulo: number): number {
  let n = 0;
  for (let i = 0; i < key.length; i += 1) {
    n = (n + key.charCodeAt(i) * (i + 1)) % 2147483647;
  }
  return Math.abs(n) % modulo;
}

function evidenceBits(input: {
  excavation: string;
  caption?: string;
  goodMoment?: string;
  joy: JoyType;
}): string[] {
  const whisper = whisperFromCaption(input.caption);
  const seen = seenFromNotes(input);
  const material = [input.excavation, seen, whisper].filter(Boolean).join(" ");
  const t = material.toLowerCase();
  const bits: string[] = [];
  const add = (bit: string) => {
    const next = bit.replace(/\s+/g, " ").trim();
    if (!next) return;
    const key = next.toLowerCase();
    if (bits.some((kept) => kept.toLowerCase() === key)) return;
    if (whisper && key !== whisper.toLowerCase() && whisper.toLowerCase().includes(key)) return;
    bits.push(next);
  };

  if (/blossom|bloom|petal/.test(t)) add("pale petals");
  if (/bark/.test(t)) add("bark");
  else if (/tree|branch/.test(t)) add("the tree");
  if (/kettle/.test(t)) add("the kettle");
  if (/steam/.test(t)) add("steam");
  if (/table/.test(t)) add("the kitchen table");
  if (/gold/.test(t) && !/gold on the table/i.test(whisper || "")) add("gold along the wood");
  if (/sky|cloud/.test(t)) add("a little sky");
  if (/sun|daylight|light/.test(t) && bits.length < 2) add("the light");
  const visual = bits.slice(0, whisper ? 2 : 3);
  if (whisper && !visual.some((kept) => kept.toLowerCase() === whisper.toLowerCase())) {
    visual.push(whisper);
  }
  if (!visual.length && seen && seen.length <= 80) visual.push(seen);
  if (!visual.length) visual.push("this still from the day");
  return visual.slice(0, 3);
}

export function mockJoyStory(input: {
  joy: JoyType;
  caption?: string;
  goodMoment?: string;
  reframed?: boolean;
  day: string;
  excavation?: string;
}): { title: string; body: string } {
  const excavation =
    input.excavation?.trim() ||
    mockExcavation({ caption: input.caption, photoNotes: input.goodMoment });
  const evidence = evidenceBits({
    excavation,
    caption: input.caption,
    goodMoment: input.goodMoment,
    joy: input.joy,
  });
  const slot = rotateIndex(input.joy.id, LOOKING_LINES.length);
  const looking = LOOKING_LINES[slot];
  const ownership = OWNERSHIP_LINES[slot];
  const door = DOOR_LINES[slot];

  const assemble = (details: string[]) =>
    `${looking} — ${details.join(", ")}, ${ownership}. ${door}`;

  let body = assemble(evidence);
  if (appStoryProblems(body, input.joy.playbackTemplate).includes("long") && evidence.length > 2) {
    body = assemble(evidence.slice(0, 2));
  }
  if (appStoryProblems(body, input.joy.playbackTemplate).length) {
    body = finishAppStory(body);
  }
  if (body.length < APP_STORY_MIN || body.length > APP_STORY_MAX) {
    body = finishAppStory(body);
  }
  return { title: "", body };
}

export function allPlaybackTemplates(): string[] {
  return JOY_TYPES.map((joy) => joy.playbackTemplate);
}
