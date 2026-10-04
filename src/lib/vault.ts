import { isSavedMomentExpired } from "./moment-expiry";
import { deleteBytes, getJSON, putJSON } from "./storage";
import type { CaptureRecord, StoryRecord, VaultRecord } from "./types";
import { anonVaultId, emailVaultId, isValidEmail, newId, normalizeEmail } from "./identity";

type SessionIndex = {
  sessions: Record<string, { vaultId: string; email?: string }>;
};

const INDEX_KEY = "index/sessions.json";

/** In-memory vaults that have never been written. A visit must not put them. */
const ephemeralVaults = new WeakSet<VaultRecord>();

function markEphemeral(vault: VaultRecord): VaultRecord {
  ephemeralVaults.add(vault);
  return vault;
}

function emptyVault(
  id: string,
  kind: VaultRecord["kind"],
  sessionId: string,
  email?: string,
): VaultRecord {
  const now = new Date().toISOString();
  return {
    id,
    kind,
    sessionId,
    email,
    createdAt: now,
    updatedAt: now,
    captureIds: [],
    stories: [],
    captures: [],
  };
}

async function loadIndex(): Promise<SessionIndex> {
  return (await getJSON<SessionIndex>(INDEX_KEY)) ?? { sessions: {} };
}

async function saveIndex(index: SessionIndex): Promise<void> {
  await putJSON(INDEX_KEY, index);
}

/** Point this browser session at a vault. Uncached read-modify-write. No-op without a session id. */
async function rememberSession(sessionId: string, vaultId: string, email?: string): Promise<void> {
  if (!sessionId) return;
  const index = await loadIndex();
  const next = email ? { vaultId, email } : { vaultId };
  const prev = index.sessions[sessionId];
  if (prev && prev.vaultId === next.vaultId && (prev.email ?? undefined) === next.email) return;
  index.sessions[sessionId] = next;
  await saveIndex(index);
}

function vaultKey(vaultId: string): string {
  return `vaults/${vaultId}/vault.json`;
}

/**
 * Byte length of the only JSON this app writes for an anon vault with no email,
 * moments, photos, voice notes, stories, captions, or yoursOpened.
 * Timestamps are fixed-width, so the length depends only on the session id.
 * `email: undefined` is omitted by JSON.stringify, matching putJSON.
 */
export function canonicalEmptyAnonVaultBytes(vaultId: string): number | null {
  if (!vaultId.startsWith("anon_")) return null;
  const sessionId = vaultId.slice("anon_".length);
  if (!sessionId || sessionId.includes("/")) return null;
  return Buffer.byteLength(JSON.stringify(emptyVault(vaultId, "anon", sessionId), null, 2));
}

export async function loadVault(vaultId: string): Promise<VaultRecord | null> {
  return getJSON<VaultRecord>(vaultKey(vaultId));
}

/**
 * Write a vault that already exists. An unsaved visit vault is left in memory
 * so opening Joy does not create a blob.
 */
export async function saveVault(vault: VaultRecord): Promise<void> {
  vault.updatedAt = new Date().toISOString();
  if (ephemeralVaults.has(vault)) return;
  await putJSON(vaultKey(vault.id), vault);
}

/** Write the vault, and the session index entry, the first time it is saved. */
export async function persistVault(vault: VaultRecord): Promise<void> {
  const creating = ephemeralVaults.has(vault);
  if (creating) ephemeralVaults.delete(vault);
  vault.updatedAt = new Date().toISOString();
  await putJSON(vaultKey(vault.id), vault);
  if (creating) await rememberSession(vault.sessionId, vault.id, vault.email);
}

function hasUserData(vault: VaultRecord): boolean {
  if (vault.email) return true;
  if (vault.stories.length > 0 || vault.captures.length > 0) return true;
  return Boolean(vault.yoursOpened && Object.keys(vault.yoursOpened).length > 0);
}

/** Email identity held in memory until the first real save. Copies anon moments when they exist. */
function unsavedEmailVault(sessionId: string, email: string, source?: VaultRecord | null): VaultRecord {
  const vault = emptyVault(emailVaultId(email), "email", sessionId, email);
  if (source && hasUserData(source)) {
    vault.captures = source.captures.map((capture) => ({ ...capture, vaultId: vault.id }));
    vault.captureIds = vault.captures.map((capture) => capture.id);
    vault.stories = source.stories.map((story) => ({ ...story, vaultId: vault.id }));
    if (source.yoursOpened && Object.keys(source.yoursOpened).length > 0) {
      vault.yoursOpened = { ...source.yoursOpened };
    }
    vault.createdAt = source.createdAt;
  }
  return markEphemeral(vault);
}

/**
 * Existing vault for this browser, or an empty in-memory vault. Does not write
 * vault.json or index/sessions.json. Ids are anon_${sessionId} and em_${emailHash}.
 */
export async function readVaultForSession(
  sessionId: string,
  gateEmail?: string | null,
): Promise<VaultRecord> {
  const gate = gateEmail && isValidEmail(gateEmail) ? normalizeEmail(gateEmail) : null;
  if (gate) {
    const emailVault = await loadVault(emailVaultId(gate));
    if (emailVault) return emailVault;
    const anon = await loadVault(anonVaultId(sessionId));
    return unsavedEmailVault(sessionId, gate, anon);
  }

  const index = await loadIndex();
  const mapped = index.sessions[sessionId];
  if (mapped?.vaultId) {
    const existing = await loadVault(mapped.vaultId);
    if (existing) return existing;
  }
  const anon = await loadVault(anonVaultId(sessionId));
  if (anon) return anon;
  return markEphemeral(emptyVault(anonVaultId(sessionId), "anon", sessionId));
}

/**
 * Drop saved moments from before the viewer's local today.
 * Each moment lasts through 23:59 of the calendar day it was saved.
 * Returns media keys that belonged only to the removed rows.
 */
export function dropExpiredSavedMoments(
  vault: VaultRecord,
  today: string,
): { changed: boolean; mediaKeys: string[] } {
  const expired = (day: string) => isSavedMomentExpired(day, today);
  const media = new Set<string>();
  let changed = false;
  const keptStories: StoryRecord[] = [];
  for (const story of vault.stories) {
    if (!expired(story.day)) {
      keptStories.push(story);
      continue;
    }
    changed = true;
    if (story.tts.audioKey) media.add(story.tts.audioKey);
  }
  const keptCaptures: CaptureRecord[] = [];
  for (const capture of vault.captures) {
    if (!expired(capture.day)) {
      keptCaptures.push(capture);
      continue;
    }
    changed = true;
    if (capture.mediaKey) media.add(capture.mediaKey);
  }
  if (vault.yoursOpened) {
    for (const day of Object.keys(vault.yoursOpened)) {
      if (!expired(day)) continue;
      delete vault.yoursOpened[day];
      changed = true;
    }
  }
  if (!changed) return { changed: false, mediaKeys: [] };
  vault.stories = keptStories;
  vault.captures = keptCaptures;
  vault.captureIds = keptCaptures.map((capture) => capture.id);
  const stillUsed = new Set<string>();
  for (const story of vault.stories) {
    if (story.tts.audioKey) stillUsed.add(story.tts.audioKey);
  }
  for (const capture of vault.captures) {
    if (capture.mediaKey) stillUsed.add(capture.mediaKey);
  }
  return { changed: true, mediaKeys: [...media].filter((key) => !stillUsed.has(key)) };
}

/** Remove expired moments from the vault file and delete their photo and audio bytes. */
export async function purgeExpiredSavedMoments(
  vault: VaultRecord,
  today: string,
): Promise<{ changed: boolean }> {
  const removed = dropExpiredSavedMoments(vault, today);
  if (!removed.changed) return { changed: false };
  await saveVault(vault);
  await Promise.all(
    removed.mediaKeys.map(async (key) => {
      try {
        await deleteBytes(key);
      } catch (error) {
        console.error(`[vault] expired media stayed key=${key}`, error);
      }
    }),
  );
  return { changed: true };
}

/** Explicit create used by saves that already decided to keep an anon vault. Visits do not call this. */
export async function getOrCreateAnonVault(sessionId: string): Promise<VaultRecord> {
  const index = await loadIndex();
  const mapped = index.sessions[sessionId];
  if (mapped) {
    const existing = await loadVault(mapped.vaultId);
    if (existing) return existing;
  }
  const existingAnon = await loadVault(anonVaultId(sessionId));
  if (existingAnon) {
    await rememberSession(sessionId, existingAnon.id, existingAnon.email);
    return existingAnon;
  }
  const vault = markEphemeral(emptyVault(anonVaultId(sessionId), "anon", sessionId));
  await persistVault(vault);
  return vault;
}

function mergeVaultInto(target: VaultRecord, source: VaultRecord): void {
  const seen = new Set(target.captures.map((capture) => capture.id));
  for (const capture of source.captures) {
    if (seen.has(capture.id)) continue;
    target.captures.push({ ...capture, vaultId: target.id });
    seen.add(capture.id);
  }
  target.captureIds = target.captures.map((capture) => capture.id);

  const storySeen = new Set(target.stories.map((story) => story.id));
  for (const story of source.stories) {
    if (storySeen.has(story.id)) continue;
    target.stories.push({ ...story, vaultId: target.id });
    storySeen.add(story.id);
  }
  if (source.yoursOpened && Object.keys(source.yoursOpened).length > 0) {
    target.yoursOpened = { ...(source.yoursOpened ?? {}), ...(target.yoursOpened ?? {}) };
  }
}

export async function attachEmail(
  sessionId: string,
  email: string,
  current?: VaultRecord,
): Promise<VaultRecord> {
  const normalized = normalizeEmail(email);
  const targetId = emailVaultId(normalized);
  let target = current?.id === targetId ? current : await loadVault(targetId);
  if (!target) {
    target = markEphemeral(emptyVault(targetId, "email", sessionId, normalized));
  }
  target.kind = "email";
  target.email = normalized;
  target.sessionId = sessionId || target.sessionId;

  const sources: VaultRecord[] = [];
  if (current && current !== target) sources.push(current);
  const anon = await loadVault(anonVaultId(sessionId));
  if (anon && !sources.includes(anon) && anon !== target) sources.push(anon);
  for (const source of sources) mergeVaultInto(target, source);

  if (anon && anon.id !== target.id) {
    anon.email = normalized;
    await persistVault(anon);
  }
  await persistVault(target);
  await rememberSession(sessionId, target.id, normalized);
  return target;
}

/**
 * Create the buyer's email vault if it is missing. Never overwrites an existing
 * vault, Payfast order, or entitlement row. The id is em_${emailHash}.
 */
export async function ensurePaymentVault(email: string, sessionId?: string): Promise<VaultRecord> {
  const normalized = normalizeEmail(email);
  if (!isValidEmail(normalized)) {
    throw new Error("Payfast vault needs an email.");
  }
  const existing = await loadVault(emailVaultId(normalized));
  if (existing) {
    if (sessionId?.trim()) await rememberSession(sessionId.trim(), existing.id, normalized);
    return existing;
  }
  const vault = markEphemeral(
    emptyVault(emailVaultId(normalized), "email", sessionId?.trim() || "", normalized),
  );
  await persistVault(vault);
  return vault;
}

export function hydrateCaptures(
  vaultId: string,
  incoming: Array<Partial<CaptureRecord>> | undefined,
  day: string,
): CaptureRecord[] {
  if (!incoming?.length) return [];
  return incoming.map((capture, index) => ({
    id: capture.id ?? `inline_${index}`,
    vaultId,
    kind:
      capture.kind === "voice" || capture.kind === "photo" || capture.kind === "text"
        ? capture.kind
        : "text",
    createdAt: capture.createdAt ?? new Date().toISOString(),
    day: capture.day ?? day,
    text: capture.text,
    transcript: capture.transcript,
    caption: capture.caption,
    goodMoment: capture.goodMoment,
    reframed: capture.reframed,
    mediaKey: capture.mediaKey,
    mediaContentType: capture.mediaContentType,
    ingestModel: capture.ingestModel,
    ingestStatus: capture.ingestStatus ?? "ok",
    joyType: capture.joyType,
    source: capture.source,
    dateVerified: capture.dateVerified,
    photoTakenAt: capture.photoTakenAt,
    locked: capture.locked,
    sparkAnswer: capture.sparkAnswer,
    photoEmphasis: capture.photoEmphasis,
    spark: capture.spark,
  }));
}

export function mergeCapturesIntoVault(
  vault: VaultRecord,
  incoming: Array<Partial<CaptureRecord>> | undefined,
  day: string,
): boolean {
  const extras = hydrateCaptures(vault.id, incoming, day);
  if (!extras.length) return false;
  const seen = new Set(vault.captures.map((capture) => capture.id));
  let added = false;
  for (const capture of extras) {
    if (seen.has(capture.id)) continue;
    vault.captures.push(capture);
    seen.add(capture.id);
    added = true;
  }
  if (added) vault.captureIds = vault.captures.map((capture) => capture.id);
  return added;
}

export async function addCapture(
  vault: VaultRecord,
  capture: Omit<CaptureRecord, "vaultId">,
): Promise<CaptureRecord> {
  const record: CaptureRecord = { ...capture, vaultId: vault.id };
  vault.captures.push(record);
  vault.captureIds = vault.captures.map((c) => c.id);
  await persistVault(vault);
  return record;
}

export async function updateCapture(
  vault: VaultRecord,
  captureId: string,
  patch: Partial<CaptureRecord>,
): Promise<CaptureRecord | null> {
  const idx = vault.captures.findIndex((c) => c.id === captureId);
  if (idx < 0) return null;
  vault.captures[idx] = { ...vault.captures[idx], ...patch };
  await persistVault(vault);
  return vault.captures[idx];
}

export async function addStory(
  vault: VaultRecord,
  story: Omit<StoryRecord, "vaultId">,
): Promise<StoryRecord> {
  const record: StoryRecord = { ...story, vaultId: vault.id };
  vault.stories.unshift(record);
  await persistVault(vault);
  return record;
}

export function capturesForDay(
  vault: VaultRecord,
  day: string,
): CaptureRecord[] {
  return vault.captures
    .filter((c) => c.day === day)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function lastStory(vault: VaultRecord): StoryRecord | null {
  return vault.stories[0] ?? null;
}

export function lastStoryForDay(
  vault: VaultRecord,
  day: string,
): StoryRecord | null {
  return vault.stories.find((s) => s.day === day) ?? null;
}

export function storyForCapture(vault: VaultRecord, captureId: string): StoryRecord | null {
  return vault.stories.find((story) => story.captureIds.includes(captureId)) ?? null;
}

export function matchingStoryForPhoto(
  vault: VaultRecord,
  day: string,
  photo: CaptureRecord | null,
): StoryRecord | null {
  if (photo) {
    const linked = storyForCapture(vault, photo.id);
    if (linked) return linked;
  }
  const story = lastStoryForDay(vault, day);
  if (!story) return null;
  if (!photo) return story;
  return story.captureIds.includes(photo.id) ? story : null;
}

export function listStories(vault: VaultRecord): StoryRecord[] {
  return [...vault.stories].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function appPhotosForDay(vault: VaultRecord, day: string): CaptureRecord[] {
  return vault.captures
    .filter((capture) => capture.day === day && capture.kind === "photo" && capture.source === "app")
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function appPhotoById(vault: VaultRecord, id: string): CaptureRecord | null {
  return (
    vault.captures.find(
      (capture) => capture.id === id && capture.kind === "photo" && capture.source === "app",
    ) ?? null
  );
}

export function hasSavedMoment(vault: VaultRecord): boolean {
  return (
    vault.stories.length > 0 ||
    vault.captures.some((capture) => capture.source === "app" && capture.kind === "photo")
  );
}

export function appPhotoForDay(vault: VaultRecord, day: string): CaptureRecord | null {
  return appPhotosForDay(vault, day).at(-1) ?? null;
}

export function isYoursOpened(vault: VaultRecord, day: string): boolean {
  return Boolean(vault.yoursOpened?.[day] || appPhotoForDay(vault, day)?.locked);
}

export function clearDayLock(vault: VaultRecord, day: string): void {
  if (vault.yoursOpened?.[day]) {
    const next = { ...vault.yoursOpened };
    delete next[day];
    vault.yoursOpened = next;
  }
}

/** Lock one capture after its story opens. Other moments that day stay put. */
export async function markMomentOpened(vault: VaultRecord, captureId: string): Promise<void> {
  const idx = vault.captures.findIndex((item) => item.id === captureId);
  if (idx >= 0) {
    const next = { ...vault.captures[idx], locked: true };
    delete next.caption;
    vault.captures[idx] = next;
  }
  await persistVault(vault);
}

export async function markYoursOpened(vault: VaultRecord, day: string): Promise<void> {
  vault.yoursOpened = { ...vault.yoursOpened, [day]: new Date().toISOString() };
  const photo = appPhotoForDay(vault, day);
  if (photo) {
    const idx = vault.captures.findIndex((item) => item.id === photo.id);
    if (idx >= 0) {
      const next = { ...vault.captures[idx], locked: true };
      delete next.caption;
      vault.captures[idx] = next;
    }
  }
  await persistVault(vault);
}

export async function scrubExpiredCaptions(vault: VaultRecord, today: string): Promise<void> {
  let changed = false;
  vault.captures = vault.captures.map((capture) => {
    if (capture.source !== "app" || !capture.caption) return capture;
    const gone =
      capture.day !== today || Boolean(capture.locked) || Boolean(vault.yoursOpened?.[capture.day]);
    if (!gone) return capture;
    changed = true;
    const next = { ...capture };
    delete next.caption;
    return next;
  });
  if (changed) await saveVault(vault);
}

/**
 * Insert a new app photo, or update the same moment id.
 * A different id on the same day is a new moment. Other stories stay.
 */
export async function saveAppMoment(
  vault: VaultRecord,
  capture: Omit<CaptureRecord, "vaultId">,
): Promise<CaptureRecord> {
  const idx = vault.captures.findIndex((item) => item.id === capture.id);
  if (idx >= 0) {
    const existing = vault.captures[idx];
    const record: CaptureRecord = {
      ...existing,
      ...capture,
      id: existing.id,
      vaultId: vault.id,
      createdAt: existing.createdAt,
    };
    if (capture.caption) record.caption = capture.caption;
    else delete record.caption;
    if (!capture.spark) delete record.spark;
    else record.spark = capture.spark;
    vault.captures[idx] = record;
    if (capture.spark || capture.mediaKey) {
      vault.stories = vault.stories.filter((story) => !story.captureIds.includes(existing.id));
      record.locked = false;
      vault.captures[idx] = record;
    }
    await persistVault(vault);
    return record;
  }
  return addCapture(vault, capture);
}

export async function upsertAppPhoto(
  vault: VaultRecord,
  capture: Omit<CaptureRecord, "vaultId">,
): Promise<CaptureRecord> {
  const existing = appPhotoForDay(vault, capture.day);
  clearDayLock(vault, capture.day);
  vault.stories = vault.stories.filter((story) => story.day !== capture.day);
  if (existing) {
    const record: CaptureRecord = {
      ...existing,
      ...capture,
      id: existing.id,
      vaultId: vault.id,
      locked: false,
    };
    if (capture.caption) record.caption = capture.caption;
    else delete record.caption;
    const idx = vault.captures.findIndex((item) => item.id === existing.id);
    vault.captures[idx] = record;
    await persistVault(vault);
    return record;
  }
  return addCapture(vault, capture);
}

export async function listEmailVaults(): Promise<VaultRecord[]> {
  const index = await loadIndex();
  const vaults: VaultRecord[] = [];
  const seen = new Set<string>();
  for (const entry of Object.values(index.sessions)) {
    if (!entry.email || seen.has(entry.vaultId)) continue;
    seen.add(entry.vaultId);
    const vault = await loadVault(entry.vaultId);
    if (vault) vaults.push(vault);
  }
  return vaults;
}

export { newId };
