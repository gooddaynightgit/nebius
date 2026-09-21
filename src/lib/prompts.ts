import {
  APP_STORY_MIN,
  APP_STORY_TARGET_MAX,
  APP_STORY_TARGET_MIN,
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

export const APP_WEAVE_SYSTEM = `You write one private bedtime story from one photo and an optional caption. You are not a coach, therapist, or wellness brand.

**Analyze the photo first**
1. What is actually in the frame (objects, place, light, text on screen).
2. If it is a screenshot, read the visible text (chat, tracker, gift).
3. Time-of-day only if the picture shows it.
4. Use the caption only as a whisper beside the image. Never more than those words.
5. Do not invent people, places, gifts, or feelings that are not in the photo or caption.
6. If the image is horrific (violence, gore, abuse, porn, hate, self-harm): write no story. Reply only: \`BLOCK\`
7. Ugly, messy, blurry, ordinary, or sad: still write.

**Joy pick** (use as colour, not a lecture)
morning sunlight / a small hello / one thing done slowly / a little movement / one corner clear / just this

**Write**
- Address the listener as *you*.
- Lovely, warm, specific, quiet at the end.
- 4–6 short sentences.
- No serotonin, circadian, oxytocin, tips, or morals.
- No title. No hashtags. No emoji.
- End on stillness, not a pep talk.

**Length**
- Target: **600–900 characters**
- Hard max: **1,200 characters** (spaces included)
- Never shorter than **400** unless you output \`BLOCK\`

**Output**
Plain story text only. Or \`BLOCK\`. Nothing else.`;

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

const JOY_COLOUR: Record<string, string> = {
  "morning-sunlight": "morning sunlight",
  "a-small-hello": "a small hello",
  "one-thing-done-slowly": "one thing done slowly",
  "a-little-movement": "a little movement",
  "one-corner-clear": "one corner clear",
  "just-this": "just this",
};

function seenFromNotes(input: {
  joy: JoyType;
  caption?: string;
  goodMoment?: string;
}): string {
  const raw = (input.goodMoment || "").replace(/\s+/g, " ").trim();
  if (!raw) return "";
  if (/you kept a still/i.test(raw)) return "";
  if (usesCannedPlayback(raw, input.joy.playbackTemplate)) return "";
  if (isSelfNegating(raw)) return "";
  return raw.replace(/\.$/, "");
}

function whisperFromCaption(caption?: string): string {
  const line = clipCaption(caption || "");
  if (!line) return "";
  return line.replace(/\.$/, "");
}

function joinSentences(parts: string[]): string {
  return parts
    .map((part) => part.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .map((part) => (/[.!?]$/.test(part) ? part : `${part}.`))
    .join(" ");
}

export function mockJoyStory(input: {
  joy: JoyType;
  caption?: string;
  goodMoment?: string;
  reframed?: boolean;
  day: string;
}): { title: string; body: string } {
  const colour = JOY_COLOUR[input.joy.id] ?? "just this";
  const seen = seenFromNotes(input);
  const whisper = whisperFromCaption(input.caption);
  const sad = Boolean(
    input.reframed || isSelfNegating(input.caption) || isSelfNegating(input.goodMoment),
  );

  const sentences: string[] = [];
  if (seen) {
    sentences.push(
      `You kept what the frame actually holds — ${seen} — and nothing else is added to the picture`,
    );
  } else {
    sentences.push(
      "You kept one still from the day, and this telling will not invent a street or a gift or a face the picture did not keep",
    );
  }

  if (whisper) {
    sentences.push(
      sad
        ? `Beside it sits only the line you wrote — ${whisper} — a whisper, never more than those words, and no happier day is made up for you`
        : `Beside the image sits only the whisper you wrote — ${whisper} — and never more than those words`,
    );
  } else {
    sentences.push(
      "There is no extra line beside the picture, so this telling will not speak a name or a feeling you did not write",
    );
  }

  sentences.push(
    `${colour.charAt(0).toUpperCase()}${colour.slice(1)} is only a colour at the edge of this hour, warm and quiet, not a lecture and not a list`,
  );

  if (sad) {
    sentences.push(
      "Ugly, messy, blurry, or heavy is allowed here; the still can stay as it is, without a pep talk or a moral",
    );
  } else if (seen) {
    sentences.push(
      "You look at that specific thing a little longer, lovely and particular, and you do not have to add anyone who was not there",
    );
  } else {
    sentences.push(
      "The picture can be ordinary or blurry or a little sad and still be the one you brought tonight",
    );
  }

  sentences.push(
    "The room can stay as it is; the night holds the frame, then goes still",
  );

  let body = joinSentences(sentences);
  if (body.length < APP_STORY_TARGET_MIN) {
    body = joinSentences([
      ...sentences.slice(0, 5),
      "You can leave it there, unhurried, with the last word already quiet",
    ]);
  }
  if (body.length < APP_STORY_MIN || body.length > APP_STORY_TARGET_MAX) {
    body = finishAppStory(body);
  }
  return { title: "", body };
}

export function allPlaybackTemplates(): string[] {
  return JOY_TYPES.map((joy) => joy.playbackTemplate);
}
