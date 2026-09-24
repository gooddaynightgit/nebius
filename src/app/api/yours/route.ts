import { captureImageDataUrl, ingestAppPhoto } from "@/lib/ingest";
import { isPlausibleClientDay } from "@/lib/day";
import { badRequest, forbidden, json, notFound } from "@/lib/http";
import { LANDING } from "@/lib/landing";
import { loadSessionVault, presentSession, requirePersonalPhotoOtp } from "@/lib/session";
import { WeaveBlockedError, WeaveNeedsWordsError, weaveStory } from "@/lib/weave";
import {
  addStory,
  appPhotoById,
  appPhotoForDay,
  lastStory,
  listStories,
  markMomentOpened,
  matchingStoryForPhoto,
  saveVault,
  storyForCapture,
} from "@/lib/vault";
import type { CaptureRecord, StoryRecord } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

const EXPIRED = "Tonight's story lived for one night. Come back with today's photo.";
const MISSING = LANDING.app.yoursMissing;

function storyPhoto(vault: { captures: CaptureRecord[] }, story: StoryRecord): CaptureRecord | null {
  const id = story.captureIds[0];
  if (!id) return null;
  return vault.captures.find((capture) => capture.id === id) ?? null;
}

function earlierStories(stories: StoryRecord[], currentId: string | undefined) {
  return [...stories]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .filter((story) => story.id !== currentId)
    .map((story) => ({
      id: story.id,
      day: story.day,
      createdAt: story.createdAt,
      captureId: story.captureIds[0] ?? null,
    }));
}

export async function GET(request: Request) {
  const denied = await requirePersonalPhotoOtp();
  if (denied) return denied;
  const url = new URL(request.url);
  const day = url.searchParams.get("day") || "";
  if (!isPlausibleClientDay(day)) return notFound(EXPIRED);
  const { sessionId, vault } = await loadSessionVault();
  const stories = listStories(vault);
  const requestedStory = url.searchParams.get("story") || "";
  const requestedMoment = url.searchParams.get("moment") || "";

  if (requestedStory) {
    const story = stories.find((item) => item.id === requestedStory);
    if (!story) return notFound(EXPIRED);
    const photo = storyPhoto(vault, story);
    return json({
      session: await presentSession(vault, sessionId, day),
      photo,
      story,
      opened: true,
      locked: true,
      earlier: earlierStories(stories, story.id),
    });
  }

  if (requestedMoment) {
    const photo = appPhotoById(vault, requestedMoment);
    const linked = photo ? storyForCapture(vault, photo.id) : null;
    if (!photo && !linked) return notFound(MISSING, { code: "missing" });
    return json({
      session: await presentSession(vault, sessionId, day),
      photo: photo ?? (linked ? storyPhoto(vault, linked) : null),
      story: linked,
      opened: Boolean(linked),
      locked: Boolean(linked),
      earlier: earlierStories(stories, linked?.id),
    });
  }

  const latest = stories[0] ?? null;
  if (latest) {
    return json({
      session: await presentSession(vault, sessionId, day),
      photo: storyPhoto(vault, latest),
      story: latest,
      opened: true,
      locked: true,
      earlier: earlierStories(stories, latest.id),
    });
  }

  const photo =
    appPhotoForDay(vault, day) ??
    [...vault.captures]
      .reverse()
      .find(
        (capture) =>
          capture.source === "app" &&
          capture.kind === "photo" &&
          !storyForCapture(vault, capture.id),
      ) ??
    null;
  if (!photo) return notFound(MISSING, { code: "missing" });
  return json({
    session: await presentSession(vault, sessionId, day),
    photo,
    story: matchingStoryForPhoto(vault, day, photo),
    opened: false,
    locked: false,
    earlier: [],
  });
}

export async function POST(request: Request) {
  const denied = await requirePersonalPhotoOtp();
  if (denied) return denied;
  const body = ((await request.json().catch(() => ({}))) ?? {}) as {
    day?: string;
    momentId?: string;
    captureId?: string;
  };
  const day = body.day || "";
  if (!isPlausibleClientDay(day)) return notFound(EXPIRED);
  const { sessionId, vault } = await loadSessionVault();
  const requested = body.captureId || body.momentId || "";
  const photo = requested ? appPhotoById(vault, requested) : appPhotoForDay(vault, day);
  const joyType = photo?.joyType;
  if (!photo) return json({ error: MISSING, code: "missing" }, 400);
  if (!joyType) return badRequest("Pick the kind of quiet joy first.");

  let story = storyForCapture(vault, photo.id) ?? matchingStoryForPhoto(vault, day, photo);
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
  await markMomentOpened(vault, photo.id);
  const stories = listStories(vault);
  return json({
    session: await presentSession(vault, sessionId, day),
    photo: appPhotoById(vault, photo.id) ?? photo,
    story,
    opened: true,
    locked: true,
    earlier: earlierStories(stories, story?.id),
  });
}
