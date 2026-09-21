export const APP_STORY_MIN = 400;
export const APP_STORY_TARGET_MIN = 600;
export const APP_STORY_TARGET_MAX = 900;
export const APP_STORY_MAX = 1200;

export const WEAVE_BLOCKED =
  "Tonight isn’t a YOURS story. This picture isn’t one we can tell. Keep the night gentle.";

export const APP_STORY_WELLNESS_RE =
  /\b(serotonin|circadian|oxytocin|endorphin|endorphins)\b/i;

const STILLNESS_EXPAND = [
  "The frame can stay as it is.",
  "Nothing more is asked of this hour.",
  "The night holds what you kept, then goes quiet.",
  "You can leave it there, unhurried.",
];

export function isWeaveBlock(text: string): boolean {
  const cleaned = text
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/```(?:\w+)?/g, "")
    .replace(/[`"'“”*]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return /^block\.?$/i.test(cleaned);
}

export function normalizeAppStory(text: string): string {
  let body = text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
  body = body.replace(/^```(?:\w+)?\s*|\s*```$/g, "").trim();
  body = body.replace(/^title:\s*.*$/gim, "");
  body = body.replace(/#[\p{L}\p{N}_]+/gu, "");
  body = body.replace(/\p{Extended_Pictographic}/gu, "");
  body = body.replace(/\n{3,}/g, "\n\n").replace(/[ \t]+\n/g, "\n");
  body = body.replace(/[ \t]{2,}/g, " ").trim();
  return body;
}

export function trimAppStory(body: string, max = APP_STORY_MAX): string {
  const text = body.trim();
  if (text.length <= max) return text;
  const slice = text.slice(0, max);
  const lastStop = Math.max(
    slice.lastIndexOf(". "),
    slice.lastIndexOf("! "),
    slice.lastIndexOf("? "),
    slice.lastIndexOf(".\n"),
  );
  if (lastStop >= APP_STORY_MIN) {
    return slice.slice(0, lastStop + 1).trim();
  }
  return slice.trim();
}

export function expandAppStory(body: string, min = APP_STORY_MIN): string {
  let next = body.replace(/\s+/g, " ").trim();
  if (!next) {
    next =
      "You kept a still from the day. This telling will not invent a street or a gift or a face. The night holds the frame, then goes quiet.";
  }
  let guard = 0;
  while (next.length < min && guard < 16) {
    const extra = STILLNESS_EXPAND[guard % STILLNESS_EXPAND.length];
    if (!next.includes(extra)) {
      next = `${next.replace(/[.!?]?$/, ".")} ${extra}`;
    } else {
      next = `${next.replace(/[.!?]?$/, ".")} The still stays with you a little longer, then rests.`;
    }
    next = next.replace(/\s+/g, " ").trim();
    guard += 1;
  }
  return trimAppStory(next);
}

export function finishAppStory(body: string): string {
  return trimAppStory(expandAppStory(body));
}

export function stripPlaybackQuotes(template: string): string {
  return template.replace(/^[\s"'“”]+|[\s"'“”]+$/g, "").trim();
}

export const CANNED_PLAYBACK_MARKERS = [
  "Ten quiet minutes. Gold on your skin",
  "You turned yourself ON",
  "fully, radiantly, joyfully there",
  "That's not a small thing. That's everything",
  "Your space is brighter. And so are you",
  "too alive for categories",
  "Endorphins like fireworks",
  "breathtakingly, beautifully — with you in it",
] as const;

export function usesCannedPlayback(body: string, template: string): boolean {
  const hay = body.replace(/\s+/g, " ");
  const raw = stripPlaybackQuotes(template);
  if (raw.length >= 32 && hay.includes(raw.slice(0, 32))) return true;
  if (raw.length >= 48 && hay.includes(raw.slice(-48))) return true;
  for (const marker of CANNED_PLAYBACK_MARKERS) {
    if (hay.includes(marker)) return true;
  }
  const sentences = raw
    .split(/(?<=\.)\s+/)
    .map((part) => part.trim())
    .filter((part) => part.length >= 28);
  return sentences.some((sentence) => hay.includes(sentence));
}

export function celebratesDespair(text: string): boolean {
  return /no\s*one cares about me|nobody cares about me|nobody loves me|i(?:'m| am) worthless/i.test(
    text,
  );
}

export function appStoryProblems(body: string, template: string): string[] {
  const problems: string[] = [];
  if (body.length < APP_STORY_MIN) problems.push("short");
  if (body.length > APP_STORY_MAX) problems.push("long");
  if (usesCannedPlayback(body, template)) problems.push("canned");
  if (APP_STORY_WELLNESS_RE.test(body)) problems.push("wellness");
  if (celebratesDespair(body)) problems.push("despair");
  if (/^title:/im.test(body)) problems.push("title");
  if (/#\w/.test(body) || /\p{Extended_Pictographic}/u.test(body)) problems.push("chrome");
  return problems;
}

export function parseAppWeaveReply(text: string): "BLOCK" | string {
  if (isWeaveBlock(text)) return "BLOCK";
  const body = normalizeAppStory(text);
  if (isWeaveBlock(body)) return "BLOCK";
  return body;
}
