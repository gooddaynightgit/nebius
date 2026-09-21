import {
  APP_STORY_WORD_MIN,
  WEAVE_BLOCKED,
  appStoryProblems,
  celebratesDespair,
  countAppStoryWords,
  finishAppStory,
  parseAppWeaveReply,
  trimAppStory,
} from "./app-story";
import { clipCaption } from "./app-capture";
import { hasTokenFactoryKey, useUltra } from "./config";
import { getJoyById } from "./landing";
import {
  appStoryModels,
  completeWithFallback,
  superModels,
  textExcavateModels,
  ultraModels,
  visionModels,
  type ChatMessage,
} from "./nebius";
import {
  APP_EXCAVATE_SYSTEM,
  APP_REFLECT_SYSTEM,
  SUPER_WEAVE_SYSTEM,
  ULTRA_CONTINUITY_SYSTEM,
  WEAVE_NEEDS_WORDS,
  mockExcavation,
  mockJoyStory,
  mockStory,
  weavableMoments,
} from "./prompts";
import { isHorrificText } from "./safety-text";
import { synthesizeStory } from "./tts";
import type { CaptureRecord, StoryRecord } from "./types";
import { newId } from "./identity";
import { putBytes } from "./storage";

export class WeaveNeedsWordsError extends Error {
  constructor() {
    super(WEAVE_NEEDS_WORDS);
    this.name = "WeaveNeedsWordsError";
  }
}

export class WeaveBlockedError extends Error {
  constructor() {
    super(WEAVE_BLOCKED);
    this.name = "WeaveBlockedError";
  }
}

function parseExcavationReply(text: string): "BLOCK" | string {
  const parsed = parseAppWeaveReply(text);
  if (parsed === "BLOCK") return "BLOCK";
  return parsed;
}

function parseTitleBody(text: string): { title: string; body: string } {
  const lines = text.trim().split(/\n/);
  const titleLine = lines.find((line) => /^title:/i.test(line));
  const title = titleLine
    ? titleLine.replace(/^title:\s*/i, "").trim()
    : "Tonight's good moments";
  const body = lines
    .filter((line) => line !== titleLine)
    .join("\n")
    .trim();
  return { title: title || "Tonight's good moments", body: body || text.trim() };
}

async function continuityThread(
  lastNight: StoryRecord | null,
  moments: string[],
): Promise<{ thread: string; model?: string }> {
  if (!lastNight || !useUltra() || !hasTokenFactoryKey()) {
    return { thread: "" };
  }
  try {
    const result = await completeWithFallback(
      ultraModels(),
      [
        { role: "system", content: ULTRA_CONTINUITY_SYSTEM },
        {
          role: "user",
          content: JSON.stringify({
            lastNightTitle: lastNight.title,
            lastNightExcerpt: lastNight.body.slice(0, 600),
            today: moments,
          }),
        },
      ],
      { temperature: 0.2, maxTokens: 200 },
    );
    const match = result.text.match(/\{[\s\S]*\}/);
    const parsed = match ? (JSON.parse(match[0]) as { thread?: string }) : {};
    return { thread: parsed.thread?.trim() ?? "", model: result.model };
  } catch {
    return { thread: "" };
  }
}

async function weaveWithSuper(
  moments: Array<{ line: string; reframed: boolean }>,
  day: string,
  thread: string,
): Promise<{ title: string; body: string; model: string } | null> {
  const messages = [
    { role: "system" as const, content: SUPER_WEAVE_SYSTEM },
    {
      role: "user" as const,
      content: [
        `Day: ${day}`,
        thread ? `Quiet continuity from last night: ${thread}` : "",
        "Good moments (quote true-good lines exactly — they are the brightest part. [silver lining] lines are hope, never despair. Then praise them, say why it landed, and the implied why — e.g. a friend reached out because they are lovable / caring / worthy. No invented biography. Never celebrate 'no one cares about me'):",
        ...moments.map(
          (moment, index) =>
            `${index + 1}. ${moment.reframed ? "[silver lining] " : ""}${moment.line}`,
        ),
      ]
        .filter(Boolean)
        .join("\n"),
    },
  ];

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const result = await completeWithFallback(superModels(), messages, {
        temperature: attempt === 0 ? 0.7 : 0.5,
        maxTokens: 700,
      });
      const parsed = parseTitleBody(result.text);
      if (parsed.body.length > 80 && !celebratesDespair(parsed.body)) {
        return { ...parsed, model: result.model };
      }
    } catch {
      // Retry once, then fall through to a word-centered mock.
    }
  }
  return null;
}

function joyColourLabel(joyTitle: string): string {
  return joyTitle
    .toLowerCase()
    .replace(/,/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function appExcavateUserText(input: {
  caption?: string;
  photoNotes: string;
  hasImage: boolean;
}): string {
  const caption = input.caption ? clipCaption(input.caption) : "";
  return [
    input.hasImage
      ? "The photo is attached. Treat it as a fragment of today. Return the five ingredient sections. No story."
      : "The photo pixels are not attached. Do your best from the caption and any photo notes. Do not invent a scene beyond those words. Return the five ingredient sections. No story.",
    input.photoNotes
      ? `Photo notes (use only if they name what is in the frame):\n${input.photoNotes}`
      : "No extra photo notes.",
    caption ? `Optional caption: ${caption}` : "No caption.",
    "If horrific: BLOCK. Otherwise ingredients only — no bedtime story.",
  ].join("\n\n");
}

export function appReflectUserText(input: {
  joyTitle: string;
  excavation: string;
  caption?: string;
}): string {
  const caption = input.caption ? clipCaption(input.caption) : "";
  return [
    "Photo description (sensory excavation of today's kept still):",
    input.excavation,
    `Chosen joy (lay this tint once, lightly, only if it fits the evidence — never print it as a label): ${joyColourLabel(input.joyTitle)}`,
    caption
      ? `Optional caption (their whisper): ${caption}`
      : "No caption.",
    "Write one short Nightly Reflection. Four beats in this order, packed into 1–2 sentences (max ~35 words): name the looking, 2–3 concrete details from the photo description and/or caption, ownership, door. Second person. Plain reflection text only. Or BLOCK.",
  ].join("\n\n");
}

/** @deprecated use appReflectUserText — YOURS no longer sends a playback template to the closer. */
export function appWeaveUserText(input: {
  joyTitle: string;
  template: string;
  excavation: string;
  caption?: string;
}): string {
  void input.template;
  return appReflectUserText(input);
}

function reflectRetryHint(problems: string[], lastBody: string): string {
  if (problems.includes("short") || (lastBody && countAppStoryWords(lastBody) < APP_STORY_WORD_MIN)) {
    return "The last draft was too short. Write 1–2 sentences, about 35 words, with all four beats: looking, 2–3 concrete details from the photo description and/or caption, ownership, door. Plain reflection text only. Or BLOCK.";
  }
  if (problems.includes("long")) {
    return "The last draft was too long. Cut to 1–2 sentences, max ~35 words. Keep the four beats. No extra scene. Plain reflection text only. Or BLOCK.";
  }
  if (problems.includes("leak") || problems.includes("lecture")) {
    return "Rewrite without questions, exclamation marks, or meta talk about prompts, excavates, captions, or instructions. Four beats. 1–2 sentences. ~35 words. Plain reflection text only. Or BLOCK.";
  }
  return "Rewrite. Follow the brief. Fresh phrasing — do not copy the example. 1–2 sentences, ~35 words. Concrete details from this entry only. No title. No joy labels. Plain reflection text only. Or BLOCK.";
}

async function excavateAppPhoto(input: {
  caption?: string;
  photoNotes: string;
  imageDataUrl?: string;
}): Promise<{ blocked: true; model: string } | { text: string; model: string } | null> {
  const imageDataUrl = input.imageDataUrl;
  const hasImage = Boolean(imageDataUrl);
  const visionText = appExcavateUserText({ ...input, hasImage });
  const visionContent: ChatMessage["content"] = hasImage && imageDataUrl
    ? [
        { type: "text", text: visionText },
        { type: "image_url", image_url: { url: imageDataUrl } },
      ]
    : visionText;
  const visionMessages: ChatMessage[] = [
    { role: "system", content: APP_EXCAVATE_SYSTEM },
    { role: "user", content: visionContent },
  ];

  const tryParse = (text: string, model: string) => {
    const parsed = parseExcavationReply(text);
    if (parsed === "BLOCK") return { blocked: true as const, model };
    if (parsed.replace(/\s+/g, " ").trim().length < 40) return null;
    return { text: parsed, model };
  };

  if (hasImage) {
    try {
      const result = await completeWithFallback(visionModels(), visionMessages, {
        temperature: 0.25,
        maxTokens: 700,
      });
      const parsed = tryParse(result.text, result.model);
      if (parsed) return parsed;
    } catch {
      // Fall through to a text-only best-effort excavation.
    }
  }

  const textMessages: ChatMessage[] = [
    { role: "system", content: APP_EXCAVATE_SYSTEM },
    {
      role: "user",
      content: appExcavateUserText({ ...input, hasImage: false }),
    },
  ];
  try {
    const result = await completeWithFallback(textExcavateModels(), textMessages, {
      temperature: 0.2,
      maxTokens: 500,
    });
    return tryParse(result.text, result.model);
  } catch {
    return null;
  }
}

async function weaveAppStoryFromExcavation(input: {
  joyTitle: string;
  template: string;
  excavation: string;
  caption?: string;
}): Promise<{ blocked: true; model: string } | { body: string; model: string } | null> {
  const userText = appReflectUserText(input);
  const messages: ChatMessage[] = [
    { role: "system", content: APP_REFLECT_SYSTEM },
    { role: "user", content: userText },
  ];

  let lastBody = "";
  let lastModel = "";
  let lastProblems: string[] = [];
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const retryHint =
        attempt === 0
          ? messages
          : [
              ...messages,
              {
                role: "user" as const,
                content: reflectRetryHint(lastProblems, lastBody),
              },
            ];
      const result = await completeWithFallback(appStoryModels(), retryHint, {
        temperature: attempt === 0 ? 0.75 : 0.5,
        maxTokens: 180,
      });
      lastModel = result.model;
      const parsed = parseAppWeaveReply(result.text);
      if (parsed === "BLOCK") {
        if (!lastBody) break;
        continue;
      }
      const trimmed = trimAppStory(parsed);
      lastBody = trimmed;
      lastProblems = appStoryProblems(trimmed, input.template);
      if (lastProblems.length === 0) {
        return { body: trimmed, model: result.model };
      }
    } catch {
      // Retry, then fall through to an honest mock.
    }
  }
  if (
    lastBody &&
    !appStoryProblems(lastBody, input.template).some(
      (item) => item === "canned" || item === "wellness" || item === "despair" || item === "leak",
    )
  ) {
    return { body: finishAppStory(lastBody), model: lastModel || "mock-fallback" };
  }
  return null;
}

async function weaveAppPhotoStory(input: {
  joyTitle: string;
  template: string;
  photoNotes: string;
  caption?: string;
  imageDataUrl?: string;
}): Promise<
  | { kind: "blocked"; model: string; excavateModel?: string }
  | { kind: "story"; body: string; model: string; excavateModel?: string }
  | { kind: "fallback"; excavation: string; excavateModel?: string }
> {
  const excavated = await excavateAppPhoto(input);
  if (excavated && "blocked" in excavated && excavated.blocked) {
    return { kind: "blocked", model: excavated.model, excavateModel: excavated.model };
  }
  const excavation =
    excavated && "text" in excavated
      ? excavated.text
      : mockExcavation({ caption: input.caption, photoNotes: input.photoNotes });
  const excavateModel = excavated && "text" in excavated ? excavated.model : "mock-excavation";
  const live = await weaveAppStoryFromExcavation({
    joyTitle: input.joyTitle,
    template: input.template,
    excavation,
    caption: input.caption,
  });
  if (live && "blocked" in live && live.blocked) {
    return { kind: "fallback", excavation, excavateModel };
  }
  if (live && "body" in live) {
    return { kind: "story", body: live.body, model: live.model, excavateModel };
  }
  return { kind: "fallback", excavation, excavateModel };
}

export async function weaveStory(options: {
  vaultId: string;
  day: string;
  captures: CaptureRecord[];
  lastNight: StoryRecord | null;
  imageDataUrl?: string;
}): Promise<StoryRecord> {
  const appCapture = options.captures.find((capture) => capture.source === "app" && capture.joyType);
  const appJoy = appCapture ? getJoyById(appCapture.joyType) : undefined;

  let title: string;
  let body: string;
  let weaveModel = "mock";
  let excavateModel: string | undefined;
  let mock = true;
  let continuityModel: string | undefined;

  if (appJoy && appCapture) {
    const caption = clipCaption(appCapture.caption ?? "") || undefined;
    const photoNotes = (appCapture.goodMoment || "").trim();
    if (isHorrificText(caption) || isHorrificText(photoNotes)) {
      throw new WeaveBlockedError();
    }
    if (hasTokenFactoryKey()) {
      const live = await weaveAppPhotoStory({
        joyTitle: appJoy.title,
        template: appJoy.playbackTemplate,
        photoNotes,
        caption,
        imageDataUrl: options.imageDataUrl,
      });
      if (live.kind === "blocked") {
        throw new WeaveBlockedError();
      }
      if (live.kind === "story") {
        title = "";
        body = live.body;
        weaveModel = live.model;
        excavateModel = live.excavateModel;
        mock = false;
      } else {
        const fallback = mockJoyStory({
          joy: appJoy,
          caption,
          goodMoment: photoNotes,
          reframed: Boolean(appCapture.reframed),
          day: options.day,
          excavation: live.excavation,
        });
        title = "";
        body = fallback.body;
        weaveModel = "mock-fallback";
        excavateModel = live.excavateModel;
      }
    } else {
      const fallback = mockJoyStory({
        joy: appJoy,
        caption,
        goodMoment: photoNotes,
        reframed: Boolean(appCapture.reframed),
        day: options.day,
      });
      title = "";
      body = fallback.body;
      excavateModel = "mock-excavation";
    }
  } else {
    const moments = weavableMoments(options.captures);
    if (!moments.length) {
      throw new WeaveNeedsWordsError();
    }
    const lines = moments.map((moment) => moment.line);

    if (hasTokenFactoryKey()) {
      const { thread, model } = await continuityThread(options.lastNight, lines);
      continuityModel = model;
      const live = await weaveWithSuper(moments, options.day, thread);
      if (live) {
        title = live.title;
        body = live.body;
        weaveModel = live.model;
        mock = false;
      } else {
        const fallback = mockStory(moments, options.day);
        title = fallback.title;
        body = fallback.body;
        weaveModel = "mock-fallback";
      }
    } else {
      const fallback = mockStory(moments, options.day);
      title = fallback.title;
      body = fallback.body;
    }
  }

  const tts = await synthesizeStory(title ? `${title}. ${body}` : body);
  let audioKey: string | undefined;
  if (tts.audio) {
    audioKey = `vaults/${options.vaultId}/stories/${options.day}.mp3`;
    await putBytes(audioKey, tts.audio, tts.contentType ?? "audio/mpeg");
  }

  return {
    id: newId("story"),
    vaultId: options.vaultId,
    day: options.day,
    title,
    body,
    createdAt: new Date().toISOString(),
    weaveModel,
    excavateModel,
    continuityModel,
    tts: {
      status: tts.status,
      model: tts.model,
      audioKey,
      contentType: tts.contentType,
      note: tts.note,
    },
    captureIds: options.captures.map((capture) => capture.id),
    mock,
  };
}
