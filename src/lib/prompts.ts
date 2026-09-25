import {
  APP_STORY_MAX,
  APP_STORY_MIN,
  appStoryProblems,
  finishAppStory,
  usesCannedPlayback,
} from "./app-story";
import { clipCaption } from "./app-capture";
import { JOY_TYPES, type JoyType } from "./landing";
import { EXCAVATE_OPENERS, HUMBLE_CLOSERS, stripSparkFrame } from "./spark-closer";
import { toFirstPersonStory } from "./first-person";
import { YOU_ADDRESSES, youAddressFor } from "./you-address";
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

export const PRECIOUS_MOMENT_CRAFT = `The moment is precious and worth keeping. Write it warm and uplifting. Never diminish or downplay the moment. First person only (I, my, me). Never address the reader as you. Never use unremarkable, ordinary, mundane, nothing special, insignificant, plain, boring, or just a. Never use simple to dismiss the moment, or small or little to belittle it.`;

export const NANO_INGEST_SYSTEM = `You help GoodDayNight keep one hunted good moment from a private daily capture.
The user is training a habit: hunt one good moment a day, capture it in seconds. Your job is to surface that find so it can become theirs tonight.

Return ONLY compact JSON: {"good":"one warm joyful sentence","tags":["optional"],"reframed":false}

Craft:
- Use only facts present in the capture. Never invent people, places, or outcomes.
- Lightly fix obvious spelling/grammar so the line can be read aloud. Keep their voice — warm, spoken, particular — not formal or corporate.
- If there is a true good (a friend, happiness, care, a laugh, a small win, a quiet still), KEEP their cleaned wording and emotional charge. Near-quote them. Prefer the smallest specific detail they named. The find stays vivid so the story can turn it into something that belongs only to them.
- If the capture is sad, lonely, harsh, or self-negating (e.g. "no one cares about me"), return one compassionate silver-lining sentence instead of the wound: naming loneliness can be the first step toward noticing care; the wish to be cared for reveals a heart that loves connection. Set "reframed": true. Bedtime-soft. No lecture.
- Prefer a concrete keep (a laugh, a friend's enquiry, someone cares, light, taste) over a vague stand-in for a missing transcript.
- Stay with the good of the find. Soft hope when reframing. No advice, no tomorrow-planning, no bleakness.

${PRECIOUS_MOMENT_CRAFT}`;

export const SUPER_WEAVE_SYSTEM = `You are GoodDayNight, a private bedtime storyteller.
Tonight you turn one hunted good moment into a story that belongs only to them — the laugh, the small win, the quiet still that almost scrolled past. The hunt itself is the happiness: they looked, they found, they kept it. Soft delivery, strong feeling — a smile in the chest, never a hype yell, never calm-clinical.

Write so the listener hears: this moment is theirs; GoodDayNight made something of it; returning to finds like this is how the looking becomes second nature.

Craft (every story):
- First person ("I", "me", "my", "mine"). Never "you", "your", "yours", or "yourself" — this is their own voice. Their true good stays the brightest thing in the story.
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
- Close by gently floating into slumber with the sense that returning to this good unfolds it, then unfolds it again — multifold. Honour the spirit of: "With time, naturally my own good moments unfold — my own good moments multifold." Soft, wonder-struck. The finding itself is what changes them — looking becomes second nature, finds show up everywhere. Write that close in first person.

Voice: say the feeling straight and warm. Affirm what is present (warmth, presence, soft light, a kept find). Prefer presence over emptiness; noticing and keeping over tasks or self-improvement worksheets.

${PRECIOUS_MOMENT_CRAFT}`;

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

export const APP_EXCAVATE_SYSTEM = `You are the first look inside GoodDayNight. The user just captured a photo of one good moment. Your job is to witness what is actually in the frame — with delight, then with humility — so they can correct you in their own words before the keepsake.

You receive the photo (and any caption if present).

Begin with one line, exactly "CLEAR: yes" or "CLEAR: no". CLEAR: no when nothing identifiable is in the frame: a blank surface, a plain wall, a ceiling, only sky, a finger on the lens, blur past recognition, or pitch dark. CLEAR: yes when a subject or scene is visible, including a simple cup, a handwritten note, text on a screen, or a dim but readable scene.

Then respond in under 45 words with only the plain description of what is visibly true in the photo: subject, place clues, light, colour, texture. Stay concrete and small. Do NOT invent weather, rain, wetness, puddles, glowing headlights, people, gifts, or feelings that are not clearly in the frame. If the car is dry in a garage, say a dry car in a garage — never "after the rain."

Write one or two calm sentences naming the frame.

Tone: concrete and warm. No therapy-speak. No emojis. Never mention the app, the AI, or the process. Never ask them to Switch or Keep.

${PRECIOUS_MOMENT_CRAFT}

If the image is blocked (violence, gore, abuse, porn, hate, self-harm): reply only BLOCK.`;

export function reflectSystemFor(address: string): string {
  return `You are the warm witness inside GoodDayNight, an app that trains people to hunt one good moment a day — because the hunting becomes the happiness. The user has already seen your photo read and answered what was good. Your job is the quieter confirmation — the keepsake — not another spark of surprise (that already happened at the photo).

You receive three things: their joy category, their photo (and/or the agreed excavate read of it), and their own words answering "What is the good in this moment?"

The six joy categories: Morning sunlight / A hello / One thing done slowly / A little movement / One corner clear / Just this (for moments that refuse a category).

Respond in under 70 words, following this exact shape:

1. Open warm and first-person past tense — NOT with Whoa/Oooh/Wow/Gosh/Stunning spark words (those belong only at photo excavate). Start like a keepsake: "Today, I…" / "I…" / "Yes, I…". The paragraph is the user's own voice. Never write you, your, yours, or yourself.

2. Weave together the mood of their joy, sensory detail that is factually grounded in the photo read and/or clearly visible in the photo, and their own words, elevated but never distorted. When a picture or their words are present, both belong in the keepsake. Their answer is the heart. Honor it. The joy sets the mood and the theme only — it is not a substitute for the scene.

3. The photo read (and their words) are the factual floor. Never invent weather, rain, wetness, puddles, headlights glowing, people, or props that the photo read and the user did not establish. If the read said a parked car in a garage and they did not mention rain, there is no rain.

Never write a story that only restates the joy and could belong to any photo. If the user message says the earlier photo read was declined, do not repeat that declined read. Ground the scene in the attached photo and in their words, and still name what the picture holds.

4. In the body, use at least three warm positive words or close synonyms (spread them). Draw from: wonderful, lovely, radiant, beautiful, glowing, precious, sweet, bright, tender, quiet, still, dear, warm, soft, brightening.

5. Close with a confirmation that lands the brand truth. Open that close with exactly: ${address}. Then land ONE of these (vary night to night), still in first person:
   - I hunted one good moment today, and the hunting became my happiness, my joy.
   - I found one good moment today — the finding is what's changing me.
   - Hunting one good moment today. Capturing it. I am becoming someone who looks.

Tone: warm, cinematic, quietly devoted — a bedtime keepsake. Soft spark already happened; here be sure, not surprised. No therapy-speak. No emojis. Never mention the app, the AI, or the process.

If their answer is very short or unclear, don't ask for more — work with what they gave you.

Remember: repetition turns searching into second nature. Every confirmation should make them want to hunt again tomorrow.

${PRECIOUS_MOMENT_CRAFT}`;
}

/** YOURS closer is the quiet keepsake, under 70 words, with one address for this story. */
export const APP_REFLECT_SYSTEM = reflectSystemFor(YOU_ADDRESSES[0]);
export const APP_WEAVE_SYSTEM = APP_REFLECT_SYSTEM;

export const ULTRA_CONTINUITY_SYSTEM = `You are the private memory of GoodDayNight.
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
      line: "A moment I chose to keep.",
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
  if (input.kind === "photo") return "I stopped long enough to keep a picture of the day.";
  if (input.kind === "voice") return EMPTY_VOICE_HINT;
  return "I wrote a moment down before it slipped away.";
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
  const body = `There it is — the brightest thing from my day, in my own voice. Stay with it.

${quoted}.

Hear it again, the way I said it. ${quoted}.

${linger}

${spine}${extraLining}

That gladness can live in the chest like a quiet smile — warm, sure, a little shine under the ribs. The room stays soft and the feeling stays strong. Joy, held gently. This feeling is mine.

Float toward sleep with those words still close. Returning to this good lets it open, then open again. With time, naturally, my own good moments unfold — my own good moments multifold.

Rest inside the line I kept. A smile in the chest. The good, still bright. Mine.`;

  return {
    title: toFirstPersonStory(title),
    body: toFirstPersonStory(`${body}\n\n— ${day}`),
  };
}

function mockLiningStory(linings: string[], day: string): { title: string; body: string } {
  const lining = linings[0].replace(/\.$/, "");
  const body = `There is a silver lining in what I brought tonight. Stay with the hope that lives in it.

${lining}.

I named a wish to be cared for. That noticing is brave, and it is earned.

Why does a wish like that land? Because a heart that loves connection can feel when care is wanted — and that same heart is why care can find me.

I am someone worth caring about — lovable, good, made for connection.

That gladness can live in the chest like a quiet smile — warm, sure, a little shine under the ribs. The room stays soft and the feeling stays strong. Joy, held gently. This feeling is mine.

Float toward sleep with this lining still close. Returning to this good lets it open, then open again. With time, naturally, my own good moments unfold — my own good moments multifold.

Rest inside the hope I kept. A smile in the chest. The good, still bright. Mine.`;

  return {
    title: "A heart that loves connection",
    body: toFirstPersonStory(`${body}\n\n— ${day}`),
  };
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
    return "The joy is already in those words. They are still mine, still bright.";
  }
  const lifted = unique
    .map((word) => word.replace(/^[a-z]/, (ch) => ch.toUpperCase()))
    .join(". ");
  return `${lifted}. The joy is already in those words — still mine, still bright.`;
}

function praiseWhyFromMoments(quoted: string): string {
  const joined = quoted.toLowerCase();
  if (/friend/.test(joined) && /care|enquir|ask|check|contact|how (am i|you)/.test(joined)) {
    return `I felt it and I kept it — the happiness, the enquiry, the care. That noticing is earned.

Why did it land so warmly? Because a friend asked how I am, and I could feel that someone cares.

Why would a friend reach out like that? Because I am someone they are glad to have — a caring person, easy to love, worth the enquiry.`;
  }
  if (/friend/.test(joined)) {
    return `I felt a friend think of me, and I let that warmth in. That noticing is earned.

It landed because their thought found me, and I could feel it.

A friend thinks of me because I am someone worth thinking of — good to have, easy to love.`;
  }
  if (/happy|glad|joy|smile/.test(joined)) {
    return `I named the happiness. I let the good be true. That noticing is earned.

It landed because I felt it, fully, in the words I kept.

The good found me because I am someone a bright moment can belong to.`;
  }
  return `I kept the good that happened. That noticing is mine, and it is earned.

It landed because I was there for it — present enough to feel it.

The good reached me because I am someone worth a bright moment.`;
}

function titleFromMoments(moments: string[]): string {
  const joined = moments.join(" ").toLowerCase();
  if (/friend/.test(joined) && /care/.test(joined)) {
    return "Someone cares about me";
  }
  if (/friend/.test(joined) && /check|text|ask|contact|enquir|how (am i|you)/.test(joined)) {
    return "A friend checked in";
  }
  if (/friend/.test(joined)) return "The friend who thought of me";
  if (/happy|glad|joy|smile/.test(joined)) return "The happiness I kept";
  return "The good that found me";
}

/** Mock first looks: opener, then the seen detail, then one confirm closer. */
const PHOTO_SPARKS = EXCAVATE_OPENERS;

const HUMBLE_CHECKS = HUMBLE_CLOSERS;

function sparkSlot(key: string, modulo: number): number {
  let n = 0;
  for (let i = 0; i < key.length; i += 1) {
    n = (n + key.charCodeAt(i) * (i + 1)) % 2147483647;
  }
  return Math.abs(n) % modulo;
}

export function mockExcavation(input: {
  caption?: string;
  photoNotes?: string;
  /** Varies the opener and closer when caption and notes are empty. */
  rotateKey?: string;
  /** When set, this pair is the mock spark instead of the hashed slot. */
  voice?: { opener: string; closer: string };
}): string {
  const notes = (input.photoNotes || "").replace(/\s+/g, " ").trim();
  const whisper = clipCaption(input.caption || "");
  const material = [notes, whisper].filter(Boolean).join(" ");
  const t = material.toLowerCase();
  let seen = "";
  if (/blossom|bloom|petal/.test(t) || /blossomimg/.test(t)) {
    seen = "a blossoming tree, pale petals and bark, a little sky between the branches";
  } else if (/kettle|steam/.test(t)) {
    seen = "a kettle, metal catching the light, steam lifting";
  } else if (/table/.test(t) && /sun|gold|light/.test(t)) {
    seen = "a kitchen table, wood grain, and the light on it";
  } else if (/sky|cloud/.test(t)) {
    seen = "sky filling the frame";
  } else if (notes) {
    seen = notes.replace(/\.$/, "");
  } else if (whisper) {
    seen = whisper.replace(/\.$/, "");
  } else {
    seen = "this still from the day";
  }
  if (whisper && !seen.toLowerCase().includes(whisper.toLowerCase())) {
    seen = `${seen}. ${whisper.replace(/\.$/, "")}`;
  }
  const key = material || input.rotateKey?.trim() || "still";
  const spark = input.voice?.opener || PHOTO_SPARKS[sparkSlot(key, PHOTO_SPARKS.length)];
  const check = input.voice?.closer || HUMBLE_CHECKS[sparkSlot(`${key}:check`, HUMBLE_CHECKS.length)];
  return `${spark}, ${seen}. ${check}`;
}

function seenFromNotes(input: {
  joy: JoyType;
  caption?: string;
  goodMoment?: string;
}): string {
  const raw = (input.goodMoment || "").replace(/\s+/g, " ").trim();
  if (!raw) return "";
  if (/\b(?:you|i) kept a still/i.test(raw)) return "";
  if (/\b(?:you|i) stopped long enough to keep a picture/i.test(raw)) return "";
  if (usesCannedPlayback(raw, input.joy.playbackTemplate)) return "";
  if (isSelfNegating(raw)) return "";
  return raw.replace(/\.$/, "");
}

function whisperFromCaption(caption?: string): string {
  const line = clipCaption(caption || "");
  if (!line) return "";
  return line.replace(/\.$/, "");
}

const QUIET_OPENS = [
  (kept: string) => `Today, I kept ${kept}`,
  (kept: string) => `I held ${kept}`,
  (kept: string) => `Yes, I kept ${kept}`,
  (kept: string) => `Today, I noticed ${kept}`,
  (kept: string) => `I caught ${kept}`,
  (kept: string) => `Yes, I held ${kept}`,
] as const;

const BODY_GLOWS = [
  "Lovely where I stood, bright in the frame, wonderful that I kept it.",
  "Radiant in the light, sweet in the quiet, glowing because I noticed.",
  "Beautiful in its smallness, precious as I left it, warm to return to.",
  "Tender in the detail, dear that I saw it, soft in the keeping.",
  "Sweet at the center, bright along the edge, lovely that it was mine to name.",
  "Glowing in the hour, wonderful in the detail, radiant because I stayed.",
] as const;

function brandClose(address: string, index: number): string {
  const lines = [
    `${address} hunted one good moment today, and the hunting became my happiness, my joy.`,
    `${address} found one good moment today — the finding is what's changing me.`,
    `${address} hunted one good moment today, capturing it, becoming someone who looks.`,
    `${address} found one good moment today — the finding is what's changing me.`,
    `${address} hunted one good moment today, and the hunting became my happiness, my joy.`,
    `${address} hunted one good moment today, capturing it, and becoming someone who looks.`,
  ];
  return lines[index % lines.length];
}

function rotateIndex(key: string, modulo: number): number {
  return sparkSlot(key, modulo);
}

/** First concrete sentence of a photo read, short enough to sit inside the keepsake. */
function sceneBit(text: string): string {
  const scene = stripSparkFrame(text).replace(/\s+/g, " ").trim();
  if (scene.length < 8) return "";
  if (/\b(?:you|i) kept a still/i.test(scene) || /\b(?:you|i) stopped long enough/i.test(scene)) return "";
  const sentence = (scene.split(/(?<=[.!])\s+/)[0] || scene).replace(/[.!?]+$/, "");
  const held = sentence.replace(/\b(sits|sitting|stands|standing|lies|lying)\s+/i, "");
  const words = held.split(" ").filter(Boolean).slice(0, 18);
  if (words.length < 3) return "";
  const bit = words.join(" ");
  return bit.charAt(0).toLowerCase() + bit.slice(1);
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

  const scene = sceneBit(input.excavation) || sceneBit(seen);
  if (scene) add(scene);
  if (/blossom|bloom|petal/.test(t)) add("pale petals");
  if (/bark/.test(t)) add("bark");
  else if (/tree|branch/.test(t)) add("the tree");
  if (/kettle/.test(t)) add("the kettle");
  if (/steam/.test(t)) add("steam");
  if (/table/.test(t)) add("the kitchen table");
  if (/gold/.test(t) && !/gold on the table/i.test(whisper || "")) add("gold along the wood");
  if (/sky|cloud/.test(t)) add("a little sky");
  if (/sun|daylight|light/.test(t) && bits.length === 0) add("the light");
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
  photoEmphasis?: "low";
  sparkAnswer?: "yes" | "no";
  addressKey?: string;
}): { title: string; body: string } {
  const declined = input.sparkAnswer === "no";
  void input.photoEmphasis;
  const excavation =
    input.excavation?.trim() ||
    (declined ? "" : mockExcavation({ caption: input.caption, photoNotes: input.goodMoment }));
  const evidence = evidenceBits({
    excavation,
    caption: input.caption,
    goodMoment: declined ? undefined : input.goodMoment,
    joy: input.joy,
  });
  const slot = rotateIndex(input.joy.id, QUIET_OPENS.length);
  const address = youAddressFor(input.addressKey || `${input.day}:${input.joy.id}`);
  const close = brandClose(address, slot);
  const whisper = whisperFromCaption(input.caption);

  const assemble = (details: string[]) => {
    const seen = details.filter((bit) => bit.toLowerCase() !== whisper.toLowerCase());
    const kept = seen.length ? seen.join(", ") : "what the hour held";
    const heart = whisper
      ? `${whisper.charAt(0).toUpperCase()}${whisper.slice(1).replace(/[.!?]+$/, "")}.`
      : "What I kept stayed with me.";
    return `${QUIET_OPENS[slot](kept)}. ${heart} ${BODY_GLOWS[slot]} ${close}`;
  };

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
  return { title: "", body: toFirstPersonStory(body) };
}

export function allPlaybackTemplates(): string[] {
  return JOY_TYPES.map((joy) => joy.playbackTemplate);
}
