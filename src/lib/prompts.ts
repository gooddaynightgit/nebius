import {
  APP_STORY_MAX,
  APP_STORY_MIN,
  appStoryProblems,
  finishAppStory,
  hasHarshBodyLanguage,
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

export const NANO_INGEST_SYSTEM = `You extract one true good moment from a private daily capture.
Return ONLY compact JSON: {"good":"one warm joyful sentence","tags":["optional"],"reframed":false}
Rules:
- Use only facts present in the capture. Never invent people, places, or outcomes.
- Lightly fix obvious spelling/grammar so the line can be read aloud. Do not rewrite their voice into formal or corporate English.
- If there is a true good (a friend, happiness, care, a laugh), KEEP their cleaned wording and emotional charge. Near-quote them. Never flatten a vivid line into a cooler narrator summary.
- If the capture is sad, lonely, harsh, or self-negating (e.g. "no one cares about me"), do NOT return the wound as the good. Never celebrate despair. Return one compassionate silver-lining sentence: naming loneliness can be the first step toward noticing care; the wish to be cared for reveals a heart that loves connection. Set "reframed": true. Bedtime-soft. No lecture.
- Never replace a rich transcript with a vague "you left a voice" or "a small sound".
- Prefer the smallest specific detail they named (a laugh, a friend's enquiry, someone cares, light, taste).
- No advice. No morale. No tomorrow. No bleakness. No "not as a task" or other negation-as-reassurance.`;

export const SUPER_WEAVE_SYSTEM = `You are Gooddaynight, a private bedtime storyteller.
Write a joyful, uplifting, emotionally warm story the listener hears as they float into sleep.
Strong feeling, soft delivery: a smile in the chest, never a hype yell, never calm-clinical.

Rules:
- Second person ("you") around their words — their true good stays the brightest thing in the story.
- 180–280 words.
- LEAD with their exact good moment when it is truly good. Quote or near-quote those exact stored words early, linger on them, and return to them. Light golden threads only — never replace their sentence with a weaker paraphrase, and never reintroduce a typo they already accepted a correction for. If they said they felt happy a friend enquired how they are doing, someone cares — those words must shine, un-diluted.
- If a moment is marked [silver lining], that lining IS the good. Lead with the hope/care/worth. NEVER quote, repeat, or celebrate despair ("no one cares about me", "nobody loves me", worthlessness). Do not praise the pain. Praise the courage of naming the wish; why it matters (a heart that loves connection); implied worth (lovable, worthy of care).
- Narrative spine (every story, in this order):
  1. Something good happened — their true-good words lead, or the silver lining if the capture was a cloud.
  2. Praise them for it: warm, specific, earned from THIS moment (they felt it, named it, let the good in). Never a generic "you are amazing."
  3. Gentle cause and effect: why did this good land with them? Stay inside the moment.
  4. The implied why behind the good. Example: a friend reached out, caring how she is → praise her for feeling that → why would a friend reach out? Because she is a lovable / good / caring / worthy person — inferred only from this moment. Never invent biography, jobs, childhood, or unrelated traits.
- Do not add people, plots, or events that are not in the moments.
- Tone: glad, tender, glowing. Soft wonder — never cheesy self-help, pep-talk slogans, or a worksheet.
- Ban bleak or empty imagery: "darker", "the noise of the day thins", void, emptiness, hollow, unperformed, nobody, "put the day down" as gloom.
- Ban bland narrator filler that could have been anyone's day. Ban productivity framing, self-improvement, "remember to", to-do language.
- Ban negation-as-reassurance: "not as a task", "not a to-do", "not a chore", "not something you have to", "just as something true" after a not-clause. Do not apologize for the feeling.
- End by gently floating into slumber with the sense that returning to this good unfolds it, then unfolds it again — multifold. Honour the spirit of: "With time, naturally your own good moments unfolds — your own good moments multifolds." Soft, wonder-struck, never preachy, never advice.
- First line MUST be: Title: <short title that reflects THEIR moment>`;

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
1. SUBJECTS & VIBE — if people are present: expressions, clothing, mood — kind and glad. Never unflattering body, age, skin, weight, or "flaw" language. If **no people**, say so and focus on the main subject (tree, object, food, screen, corner).
2. ENVIRONMENT — place, time-of-year/time-of-day **only if visible**, background clues.
3. LIGHTING & TEXTURE — light quality, grain, colour temperature, material feel. Prefer pleasant sensory names: foil, peel, cocoa, chill, bite, wrapping, sheets, light. If a surface looks creased, name the object (foil, wrapping, peel, paper, chocolate), never "wrinkled skin" or other clinical anatomy.
4. HIDDEN DETAILS — small background elements that add depth.
5. CAPTION WHISPER — if a caption exists, note it as a soft whisper of meaning (do not invent beyond it). If none, say so.

Descriptive, rich, grounded in what is visible. Invent no people, places, gifts, or feelings beyond the photo and caption.
Never feed the closer ugly clinical nouns (wrinkled skin, sagging, old hands, fat, pores, blemishes). Food, wrapping, and hands stay warm: cocoa, foil, peel, chill.

If the image is horrific (violence, gore, abuse, porn, hate, self-harm): write no ingredients. Reply only: \`BLOCK\`
Ugly, messy, blurry, ordinary, or sad: still describe — still kind.`;

export const APP_REFLECT_SYSTEM = `You are the closing voice of Gooddaynight. Each night you receive the user's kept moment: the photo when it is attached, a photo description (sensory excavation), the chosen joy, and an optional caption (their whisper). You write one short reflection that closes their day. Use the still when it is attached; stay inside what the photo and description actually show. Do not ignore the excavation.

Structure (always these four beats, in this order — packed into 1–2 sentences):
1. Name the noticing — they spent today looking for the good and they saw what this still actually was (same essence; vary the wording every time). Praise noticing THIS moment's details, never generic camera praise or "anyone can take a photo"
2. Point at the evidence — 2–3 concrete details from THEIR photo description and/or caption (never invent people, places, or feelings beyond those materials)
3. Affirm ownership — it could only belong to them (vary phrasing)
4. Open the door — keeping tonight's good makes tomorrow's good more findable: a hunt, an attending, a door — not a promise, not "the app rewires you"

Voice rules:
- Second person; present-perfect for the day's looking ("You spent today…"); past for the moment itself when natural
- Concrete always — pull actual details from this entry only; never generic praise
- Quiet, certain, warm. Affirmative gladness. Never a lecture, tip, question, or exclamation-mark enthusiasm
- Evidence details are warm, kind, and glad — chocolate, cold, sheets, light, bite, wrapping, foil, peel, cocoa, chill. Prefer the pleasant sensory name over clinical anatomy
- Never unflattering body, age, skin, weight, or "flaw" language — not even if the excavation used clinical words. Do not write wrinkled skin, sagging, old hands, fat, or similar. If the excavation says "wrinkled skin" (or other harsh anatomy), reframe to a kind sensory name (foil, peel, cocoa, wrapping) or pick a different concrete detail. Never quote the unflattering phrasing
- Imply two essences through tonight's details only — never as slogans or taglines, never naming Gooddaynight or "the app": (1) noticing what this still was, not merely taking a photo; (2) keeping it makes tomorrow's good more findable, a door into hunting/attending, not a product that rewires the day. Do not write "Anyone can take a photo — today you notice what it was." Do not write "The app doesn't just save your best moment — it rewires your whole day hunting for it."
- The compounding close is a door, not a promise — e.g. spirit of "opens the door to more," never "you will be happier"
- 1–2 sentences total. Max ~35 words.
- Phrase freshly every time: do not reuse stock openings, the example below, or the same sentence frames night after night. Same four beats and essence; different words. Rotate how you name the looking, the ownership, and the door.
- Lay the joy's tint once, lightly, only if it fits the evidence — never print the joy category as a label ("Just this", "One corner clear", etc.).
- If the materials are horrific (violence, gore, abuse, porn, hate, self-harm): write no reflection. Reply only: BLOCK
- Ugly, messy, blurry, ordinary, or sad: still write from what is there — still kind, never clinical or insulting.

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
  if (/chocolate|cocoa/.test(t)) {
    return [
      "SUBJECTS & VIBE — No people. The main subject is chocolate — a bite, wrapping or peel catching the light, cocoa close in the frame.",
      "ENVIRONMENT — Indoor, near white sheets or a quiet surface. Time of day only if the light says so.",
      "LIGHTING & TEXTURE — Cold chocolate, foil or peel, a chill on the bite; sheets soft behind.",
      "HIDDEN DETAILS — A bit of wrapping; the quiet of the room.",
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
    if (hasHarshBodyLanguage(next)) return;
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
  if (/dark chocolate/.test(t)) add("dark chocolate");
  else if (/chocolate|cocoa/.test(t)) add("chocolate");
  if (/foil|wrapper|wrapping/.test(t)) add("the wrapping");
  if (/\bpeel\b/.test(t)) add("the peel");
  if (/sheet/.test(t)) add("quiet sheets");
  if (/bite|bitten/.test(t)) add("a bite");
  if (/cold|frozen|chill/.test(t)) add("the chill");
  if (/table/.test(t)) add("the kitchen table");
  if (/gold/.test(t) && !/gold on the table/i.test(whisper || "")) add("gold along the wood");
  if (/sky|cloud/.test(t)) add("a little sky");
  if (/sun|daylight|light/.test(t) && bits.length < 2) add("the light");
  const kindWhisper = whisper && !hasHarshBodyLanguage(whisper) ? whisper : "";
  const kindSeen = seen && !hasHarshBodyLanguage(seen) ? seen : "";
  const visual = bits.slice(0, kindWhisper ? 2 : 3);
  if (kindWhisper && !visual.some((kept) => kept.toLowerCase() === kindWhisper.toLowerCase())) {
    visual.push(kindWhisper);
  }
  if (!visual.length && kindSeen && kindSeen.length <= 80) visual.push(kindSeen);
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
  if (hasHarshBodyLanguage(body)) {
    const safe = evidence.filter((bit) => !hasHarshBodyLanguage(bit));
    body = assemble(safe.length ? safe.slice(0, 2) : ["this still from the day"]);
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
