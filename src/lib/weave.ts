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
  appStoryTextModels,
  appStoryVisionModels,
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
import { shrinkDataUrlForModels } from "./model-image";
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
  hasImage?: boolean;
}): string {
  const caption = input.caption ? clipCaption(input.caption) : "";
  const photo = input.hasImage ? "Photo: attached" : "Photo: description";
  const description = input.excavation?.trim() || "No photo description.";
  return [
    `Joy picked: ${input.joyTitle}`,
    `${photo}\n${description}`,
    caption ? `Their answer: ${caption}` : "Their answer:",
  ].join("\n\n");
}

export function appReflectUserContent(input: {
  joyTitle: string;
  excavation: string;
  caption?: string;
  imageDataUrl?: string;
}): ChatMessage["content"] {
  const userText = appReflectUserText({
    ...input,
    hasImage: Boolean(input.imageDataUrl),
  });
  if (input.imageDataUrl) {
    return [
      { type: "text", text: userText },
      { type: "image_url", image_url: { url: input.imageDataUrl } },
    ];
  }
  return userText;
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

type AppReflectFail = {
  lastBody: string;
  lastModel: string;
  lastProblems: string[];
  lastError?: string;
};

export function formatCloserHint(fail?: AppReflectFail | null): string {
  if (!fail) return "closer: no live draft";
  const error = (fail.lastError || "")
    .replace(/Bearer\s+\S+/gi, "Bearer [redacted]")
    .replace(/\bsk-[A-Za-z0-9._-]+/g, "[redacted]");
  const parts = [
    fail.lastModel ? `model=${fail.lastModel}` : "",
    fail.lastProblems.length ? `problems=${fail.lastProblems.join(",")}` : "",
    error ? `error=${error}` : "",
  ].filter(Boolean);
  return (parts.join(" ") || "closer: no live draft").slice(0, 180);
}

function mergeReflectFail(primary?: AppReflectFail, next?: AppReflectFail): AppReflectFail {
  if (!next && !primary) return { lastBody: "", lastModel: "", lastProblems: [] };
  if (!next) return primary as AppReflectFail;
  if (!primary) return next;
  const errors = [primary.lastError, next.lastError].filter(Boolean);
  return {
    lastBody: next.lastBody || primary.lastBody,
    lastModel: next.lastModel || primary.lastModel,
    lastProblems: next.lastProblems.length ? next.lastProblems : primary.lastProblems,
    lastError: errors.join(" | ") || undefined,
  };
}

function closerErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message.slice(0, 240);
  return String(error).slice(0, 240);
}

function isRetryableCloserError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  const status = Number(message.match(/failed \((\d{3})\)/)?.[1]);
  if (!Number.isFinite(status)) return false;
  if (status === 429) return true;
  if (status >= 500) return true;
  return false;
}

function logAppReflectFallback(fail?: AppReflectFail) {
  const lastModel = fail?.lastModel || "none";
  const lastProblems = fail?.lastProblems?.join(",") || "none";
  const lastError = fail?.lastError || "none";
  console.warn(
    `[yours] Nightly Reflection using mockJoyStory lastModel=${lastModel} lastProblems=${lastProblems} lastError=${lastError}`,
  );
}

function reflectRetryHint(problems: string[], lastBody: string): string {
  if (problems.includes("short") || (lastBody && countAppStoryWords(lastBody) < APP_STORY_WORD_MIN)) {
    return 'The last draft was too short. Open with excitement — Oooh you, Today, Wow you, How awesome is this, you, Brilliant, or Look at you. Weave the photo, the joy, and their answer with at least three bright words. Close with Fantastic, Wonderful, Perfect, Beautiful, or Yes, plus you, and one hunt-find truth. Under 70 words. One soft exclamation on the opening is welcome.';
  }
  if (problems.includes("long")) {
    return 'The last draft was too long. Keep it under 70 words and at most four sentences. Open with excitement, weave the photo, the joy, and their answer, and close with a Fantastic-family word plus you and one hunt-find truth. One soft exclamation on the opening is welcome.';
  }
  if (problems.includes("leak") || problems.includes("lecture")) {
    return 'Rewrite without questions, extra exclamation marks, or mention of the app, the AI, or the process. One soft exclamation on the opening is welcome. Under 70 words. Exciting open, three bright words, brand close.';
  }
  return 'Rewrite the confirmation. Rotate an exciting open (Oooh you, Today, Wow you, How awesome is this, you, Brilliant, Look at you). Weave photo, joy, and their words with at least three bright words. Close with Fantastic, Wonderful, Perfect, Beautiful, or Yes, plus you, and one hunt-find truth. Under 70 words.';
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

const FATAL_REFLECT_PROBLEMS = new Set(["canned", "wellness", "despair", "leak"]);

async function reflectWithModels(
  models: string[],
  baseMessages: ChatMessage[],
  template: string,
): Promise<{ blocked: true; model: string } | { body: string; model: string } | { fail: AppReflectFail }> {
  const fail: AppReflectFail = {
    lastBody: "",
    lastModel: "",
    lastProblems: [],
  };
  if (!models.length) return { fail };

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const retryHint =
        attempt === 0
          ? baseMessages
          : [
              ...baseMessages,
              {
                role: "user" as const,
                content: reflectRetryHint(fail.lastProblems, fail.lastBody),
              },
            ];
      const result = await completeWithFallback(models, retryHint, {
        temperature: attempt === 0 ? 0.75 : 0.5,
        maxTokens: 420,
      });
      fail.lastModel = result.model;
      const parsed = parseAppWeaveReply(result.text);
      if (parsed === "BLOCK") {
        if (!fail.lastBody) break;
        continue;
      }
      const trimmed = trimAppStory(parsed);
      fail.lastBody = trimmed;
      fail.lastProblems = appStoryProblems(trimmed, template);
      if (fail.lastProblems.length === 0) {
        return { body: trimmed, model: result.model };
      }
    } catch (error) {
      fail.lastError = closerErrorMessage(error);
      console.warn(
        `[yours] closer attempt ${attempt + 1}/3 models=${models.join("|")} lastError=${fail.lastError}`,
      );
      // 4xx (except 429) fail-soft into the next model set (Qwen/Super).
      // completeWithFallback already tried every id in this set.
      if (!isRetryableCloserError(error)) break;
    }
  }
  if (
    fail.lastBody &&
    !fail.lastProblems.some((item) => FATAL_REFLECT_PROBLEMS.has(item))
  ) {
    return { body: finishAppStory(fail.lastBody), model: fail.lastModel || "mock-fallback" };
  }
  return { fail };
}

export async function weaveAppStoryFromExcavation(input: {
  joyTitle: string;
  template: string;
  excavation: string;
  caption?: string;
  imageDataUrl?: string;
}): Promise<{ blocked: true; model: string } | { body: string; model: string } | { fail: AppReflectFail } | null> {
  const visionIds = input.imageDataUrl ? appStoryVisionModels() : [];
  const textIds = appStoryTextModels();
  let lastFail: AppReflectFail | undefined;

  if (visionIds.length && input.imageDataUrl) {
    const visionMessages: ChatMessage[] = [
      { role: "system", content: APP_REFLECT_SYSTEM },
      { role: "user", content: appReflectUserContent(input) },
    ];
    const live = await reflectWithModels(visionIds, visionMessages, input.template);
    if ("body" in live || "blocked" in live) return live;
    lastFail = live.fail;
  }

  if (textIds.length) {
    const textMessages: ChatMessage[] = [
      { role: "system", content: APP_REFLECT_SYSTEM },
      { role: "user", content: appReflectUserText({ ...input, hasImage: false }) },
    ];
    const live = await reflectWithModels(textIds, textMessages, input.template);
    if ("body" in live || "blocked" in live) return live;
    lastFail = mergeReflectFail(lastFail, live.fail);
  }

  return { fail: lastFail ?? { lastBody: "", lastModel: "", lastProblems: [] } };
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
  | { kind: "fallback"; excavation: string; excavateModel?: string; fail?: AppReflectFail }
> {
  const imageDataUrl = input.imageDataUrl
    ? shrinkDataUrlForModels(input.imageDataUrl)
    : undefined;
  const excavated = await excavateAppPhoto({ ...input, imageDataUrl });
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
    imageDataUrl,
  });
  if (live && "blocked" in live && live.blocked) {
    const fail = {
      lastBody: "",
      lastModel: live.model,
      lastProblems: ["block"],
      lastError: "BLOCK",
    };
    logAppReflectFallback(fail);
    return { kind: "fallback", excavation, excavateModel, fail };
  }
  if (live && "body" in live) {
    return { kind: "story", body: live.body, model: live.model, excavateModel };
  }
  logAppReflectFallback(live && "fail" in live ? live.fail : undefined);
  return {
    kind: "fallback",
    excavation,
    excavateModel,
    fail: live && "fail" in live ? live.fail : undefined,
  };
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
  let closerHint: string | undefined;

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
        closerHint = formatCloserHint(live.fail);
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
    closerHint,
  };
}
