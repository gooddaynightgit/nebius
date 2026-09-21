import {
  APP_STORY_MIN,
  WEAVE_BLOCKED,
  appStoryProblems,
  celebratesDespair,
  finishAppStory,
  parseAppWeaveReply,
  trimAppStory,
} from "./app-story";
import { clipCaption } from "./app-capture";
import { MODELS, hasTokenFactoryKey, useUltra } from "./config";
import { getJoyById } from "./landing";
import { completeWithFallback, superModels, ultraModels, type ChatMessage } from "./nebius";
import {
  APP_WEAVE_SYSTEM,
  SUPER_WEAVE_SYSTEM,
  ULTRA_CONTINUITY_SYSTEM,
  WEAVE_NEEDS_WORDS,
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

function appWeaveModels(hasImage: boolean): string[] {
  if (hasImage && MODELS.nanoOmni) {
    return [MODELS.nanoOmni, MODELS.super].filter(Boolean);
  }
  return superModels();
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

function appWeaveUserText(input: {
  joyTitle: string;
  template: string;
  photoNotes: string;
  caption?: string;
  hasImage: boolean;
}): string {
  const caption = input.caption ? clipCaption(input.caption) : "";
  return [
    input.hasImage
      ? "The photo is attached. Analyze the frame first: objects, place, light, and any text on screen. Time of day only if the picture shows it. If this is a screenshot, read the visible text."
      : "The photo pixels are not attached. Do not invent objects, places, people, gifts, or feelings. Write only from the joy colour, the optional caption whisper, and any photo notes below. If those notes are thin, stay general and honest — still write.",
    `Joy pick (colour only, not a lecture): ${joyColourLabel(input.joyTitle)}`,
    `Joy playback string (TEMPLATE to rephrase — not the story; never copy its sentences):\n${input.template}`,
    input.photoNotes
      ? `Photo notes (use only if they name what is actually in the frame):\n${input.photoNotes}`
      : "No extra photo notes.",
    caption
      ? `Optional caption (whisper beside the image; never more than these words): ${caption}`
      : "No caption.",
    "Write 4–6 short sentences. Target 600–900 characters. Hard max 1,200. Never under 400 unless BLOCK. Plain story text only. Or BLOCK.",
  ].join("\n\n");
}

async function weaveAppWithNemotron(input: {
  joyTitle: string;
  template: string;
  photoNotes: string;
  caption?: string;
  imageDataUrl?: string;
}): Promise<{ blocked: true; model: string } | { body: string; model: string } | null> {
  const hasImage = Boolean(input.imageDataUrl);
  const userText = appWeaveUserText({ ...input, hasImage });
  const userContent: ChatMessage["content"] = hasImage
    ? [
        { type: "text", text: userText },
        { type: "image_url", image_url: { url: input.imageDataUrl } },
      ]
    : userText;
  const messages: ChatMessage[] = [
    { role: "system", content: APP_WEAVE_SYSTEM },
    { role: "user", content: userContent },
  ];

  let lastBody = "";
  let lastModel = "";
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const retryHint =
        attempt === 0
          ? messages
          : [
              ...messages,
              {
                role: "user" as const,
                content:
                  lastBody && lastBody.length < APP_STORY_MIN
                    ? "The last draft was too short. Write 4–6 short sentences, 600–900 characters, grounded in the photo and caption. Plain story text only. Or BLOCK."
                    : "Rewrite. Follow the brief exactly. Fresh sentences. No template dump. No title. No wellness words. 600–900 characters. Plain story text only. Or BLOCK.",
              },
            ];
      const result = await completeWithFallback(appWeaveModels(hasImage), retryHint, {
        temperature: attempt === 0 ? 0.7 : 0.45,
        maxTokens: 500,
      });
      lastModel = result.model;
      const parsed = parseAppWeaveReply(result.text);
      if (parsed === "BLOCK") {
        if (!lastBody) return { blocked: true, model: result.model };
        break;
      }
      lastBody = parsed;
      const problems = appStoryProblems(parsed, input.template).filter((item) => item !== "long");
      if (problems.length === 0) {
        return { body: trimAppStory(parsed), model: result.model };
      }
    } catch {
      // Retry, then fall through to an honest mock.
    }
  }
  if (lastBody && !appStoryProblems(lastBody, input.template).some((item) => item === "canned" || item === "wellness" || item === "despair")) {
    return { body: finishAppStory(lastBody), model: lastModel || "mock-fallback" };
  }
  return null;
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
  let mock = true;
  let continuityModel: string | undefined;

  if (appJoy && appCapture) {
    const caption = clipCaption(appCapture.caption ?? "") || undefined;
    const photoNotes = (appCapture.goodMoment || "").trim();
    if (isHorrificText(caption) || isHorrificText(photoNotes)) {
      throw new WeaveBlockedError();
    }
    const fallback = mockJoyStory({
      joy: appJoy,
      caption,
      goodMoment: photoNotes,
      reframed: Boolean(appCapture.reframed),
      day: options.day,
    });
    if (hasTokenFactoryKey()) {
      const live = await weaveAppWithNemotron({
        joyTitle: appJoy.title,
        template: appJoy.playbackTemplate,
        photoNotes,
        caption,
        imageDataUrl: options.imageDataUrl,
      });
      if (live && "blocked" in live && live.blocked) {
        throw new WeaveBlockedError();
      }
      if (live && "body" in live) {
        title = "";
        body = live.body;
        weaveModel = live.model;
        mock = false;
      } else {
        title = "";
        body = fallback.body;
        weaveModel = "mock-fallback";
      }
    } else {
      title = "";
      body = fallback.body;
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
