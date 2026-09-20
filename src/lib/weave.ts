import { hasTokenFactoryKey, useUltra } from "./config";
import { completeWithFallback, superModels, ultraModels } from "./nebius";
import {
  SUPER_WEAVE_SYSTEM,
  ULTRA_CONTINUITY_SYSTEM,
  WEAVE_NEEDS_WORDS,
  mockStory,
  weavableMoments,
} from "./prompts";
import { synthesizeStory } from "./tts";
import type { CaptureRecord, StoryRecord } from "./types";
import { newId } from "./identity";
import { putBytes } from "./storage";

function celebratesDespair(text: string): boolean {
  return /no\s*one cares about me|nobody cares about me|nobody loves me|i(?:'m| am) worthless/i.test(
    text,
  );
}

export class WeaveNeedsWordsError extends Error {
  constructor() {
    super(WEAVE_NEEDS_WORDS);
    this.name = "WeaveNeedsWordsError";
  }
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

export async function weaveStory(options: {
  vaultId: string;
  day: string;
  captures: CaptureRecord[];
  lastNight: StoryRecord | null;
}): Promise<StoryRecord> {
  const moments = weavableMoments(options.captures);
  if (!moments.length) {
    throw new WeaveNeedsWordsError();
  }
  const lines = moments.map((moment) => moment.line);

  let title: string;
  let body: string;
  let weaveModel = "mock";
  let mock = true;
  let continuityModel: string | undefined;

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

  const tts = await synthesizeStory(`${title}. ${body}`);
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
