import { hasTokenFactoryKey, useUltra } from "./config";
import { completeWithFallback, superModels, ultraModels } from "./nebius";
import {
  SUPER_WEAVE_SYSTEM,
  ULTRA_CONTINUITY_SYSTEM,
  mockStory,
} from "./prompts";
import { synthesizeStory } from "./tts";
import type { CaptureRecord, StoryRecord } from "./types";
import { newId } from "./identity";
import { putBytes } from "./storage";

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

export async function weaveStory(options: {
  vaultId: string;
  day: string;
  captures: CaptureRecord[];
  lastNight: StoryRecord | null;
}): Promise<StoryRecord> {
  const moments = options.captures
    .map((c) => c.goodMoment || c.transcript || c.caption || c.text)
    .filter((value): value is string => Boolean(value && value.trim()));

  let title: string;
  let body: string;
  let weaveModel = "mock";
  let mock = true;
  let continuityModel: string | undefined;

  if (hasTokenFactoryKey() && moments.length) {
    const { thread, model } = await continuityThread(options.lastNight, moments);
    continuityModel = model;
    try {
      const result = await completeWithFallback(
        superModels(),
        [
          { role: "system", content: SUPER_WEAVE_SYSTEM },
          {
            role: "user",
            content: [
              `Day: ${options.day}`,
              thread ? `Quiet continuity from last night: ${thread}` : "",
              "Good moments:",
              ...moments.map((m, i) => `${i + 1}. ${m}`),
            ]
              .filter(Boolean)
              .join("\n"),
          },
        ],
        { temperature: 0.7, maxTokens: 700 },
      );
      const parsed = parseTitleBody(result.text);
      title = parsed.title;
      body = parsed.body;
      weaveModel = result.model;
      mock = false;
    } catch {
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
    captureIds: options.captures.map((c) => c.id),
    mock,
  };
}
