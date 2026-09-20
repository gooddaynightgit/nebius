import { canUnlockStory, isValidEmail, normalizeEmail, todayStamp } from "@/lib/identity";
import { badRequest, forbidden, json, unauthorized } from "@/lib/http";
import { loadSessionVault, setGateEmail, toPublicSession } from "@/lib/session";
import { weaveCronSecret } from "@/lib/config";
import {
  addStory,
  attachEmail,
  capturesForDay,
  lastStory as latest,
  lastStoryForDay,
  listEmailVaults,
  mergeCapturesIntoVault,
  saveVault,
} from "@/lib/vault";
import { weaveStory } from "@/lib/weave";
import type { CaptureRecord } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

type WeaveBody = {
  day?: string;
  email?: string;
  captures?: Array<Partial<CaptureRecord>>;
};

export async function POST(request: Request) {
  const cron = weaveCronSecret();
  const auth = request.headers.get("authorization");
  if (cron && auth === `Bearer ${cron}`) {
    return weaveAll(request);
  }

  let { sessionId, vault } = await loadSessionVault();
  const body = ((await request.json().catch(() => ({}))) ?? {}) as WeaveBody;
  const day = body.day || todayStamp();
  const added = mergeCapturesIntoVault(vault, body.captures, day);
  if (added) await saveVault(vault);

  if (!vault.email) {
    const email = normalizeEmail(body.email ?? "");
    if (isValidEmail(email) && vault.captures.length >= 1) {
      vault = await attachEmail(sessionId, email);
      await setGateEmail(email);
    }
  }

  if (!canUnlockStory(vault.captures.length, vault.email ?? null)) {
    if (vault.captures.length < 1) {
      return forbidden("Save a moment first.");
    }
    return forbidden("Enter your email to hear your story.");
  }

  const captures = capturesForDay(vault, day);
  if (!captures.length) return badRequest("No moments for this day yet.");

  const story = await weaveStory({
    vaultId: vault.id,
    day,
    captures,
    lastNight: latest(vault),
  });
  await addStory(vault, story);
  return json({
    story,
    session: toPublicSession(vault, sessionId, day),
  });
}

async function weaveAll(request: Request) {
  if (!weaveCronSecret()) return unauthorized("WEAVE_CRON_SECRET is not set");
  const body = ((await request.json().catch(() => ({}))) ?? {}) as WeaveBody;
  const day = body.day || todayStamp();
  const vaults = await listEmailVaults();
  const stories = [];
  for (const vault of vaults) {
    const captures = capturesForDay(vault, day);
    if (!captures.length) continue;
    const existing = lastStoryForDay(vault, day);
    if (existing && existing.day === day) continue;
    const story = await weaveStory({
      vaultId: vault.id,
      day,
      captures,
      lastNight: latest(vault),
    });
    await addStory(vault, story);
    stories.push({ vaultId: vault.id, storyId: story.id, mock: story.mock });
  }
  return json({ day, woven: stories.length, stories });
}
