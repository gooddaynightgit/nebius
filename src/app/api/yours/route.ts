import { captureImageDataUrl, ingestAppPhoto } from "@/lib/ingest";
import { isPlausibleClientDay } from "@/lib/day";
import { badRequest, forbidden, json, notFound } from "@/lib/http";
import { LANDING } from "@/lib/landing";
import { loadSessionVault, presentSession } from "@/lib/session";
import { WeaveBlockedError, WeaveNeedsWordsError, weaveStory } from "@/lib/weave";
import {
  addStory,
  appPhotoForDay,
  isYoursOpened,
  lastStory,
  matchingStoryForPhoto,
  markYoursOpened,
  saveVault,
} from "@/lib/vault";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

const EXPIRED = "Tonight's story lived for one night. Come back with today's photo.";
const MISSING = LANDING.app.yoursMissing;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const day = url.searchParams.get("day") || "";
  if (!isPlausibleClientDay(day)) return notFound(EXPIRED);
  const { sessionId, vault } = await loadSessionVault();
  const photo = appPhotoForDay(vault, day);
  const storyForPhoto = matchingStoryForPhoto(vault, day, photo);
  const opened = isYoursOpened(vault, day);
  if (!photo && !storyForPhoto) {
    const hadPrior =
      vault.captures.some((capture) => capture.source === "app" && capture.day !== day) ||
      vault.stories.some((item) => item.day !== day);
    if (hadPrior) return notFound(EXPIRED);
    return notFound(MISSING, { code: "missing" });
  }
  return json({
    session: await presentSession(vault, sessionId, day),
    photo,
    story: opened ? storyForPhoto : null,
    opened,
    locked: opened,
  });
}

export async function POST(request: Request) {
  const body = ((await request.json().catch(() => ({}))) ?? {}) as { day?: string };
  const day = body.day || "";
  if (!isPlausibleClientDay(day)) return notFound(EXPIRED);
  const { sessionId, vault } = await loadSessionVault();
  const photo = appPhotoForDay(vault, day);
  const joyType = photo?.joyType;
  if (!photo) return json({ error: MISSING, code: "missing" }, 400);
  if (!joyType) return badRequest("Pick the kind of quiet joy first.");

  let story = matchingStoryForPhoto(vault, day, photo);
  if (!story) {
    try {
      const imageDataUrl = await captureImageDataUrl(photo);
      const ingest = await ingestAppPhoto({
        caption: photo.caption,
        imageDataUrl,
        joyType,
      });
      const idx = vault.captures.findIndex((item) => item.id === photo.id);
      if (idx >= 0) {
        vault.captures[idx] = {
          ...vault.captures[idx],
          goodMoment: ingest.goodMoment,
          reframed: ingest.reframed,
          ingestModel: ingest.model,
          ingestStatus: ingest.status,
        };
        await saveVault(vault);
      }
      const fresh = idx >= 0 ? vault.captures[idx] : { ...photo, ...ingest };
      story = await weaveStory({
        vaultId: vault.id,
        day,
        captures: [fresh],
        lastNight: lastStory(vault),
        imageDataUrl,
      });
      await addStory(vault, story);
    } catch (error) {
      if (error instanceof WeaveBlockedError) {
        return forbidden(error.message, { code: "blocked" });
      }
      if (error instanceof WeaveNeedsWordsError) return badRequest(error.message);
      throw error;
    }
  }
  await markYoursOpened(vault, day);
  return json({
    session: await presentSession(vault, sessionId, day),
    photo: appPhotoForDay(vault, day),
    story,
    opened: true,
    locked: true,
  });
}
