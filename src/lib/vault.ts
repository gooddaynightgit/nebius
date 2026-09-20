import { getJSON, putJSON } from "./storage";
import type { CaptureRecord, StoryRecord, VaultRecord } from "./types";
import { anonVaultId, emailVaultId, newId } from "./identity";

type SessionIndex = {
  sessions: Record<string, { vaultId: string; email?: string }>;
};

const INDEX_KEY = "index/sessions.json";

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

function vaultKey(vaultId: string): string {
  return `vaults/${vaultId}/vault.json`;
}

export async function loadVault(vaultId: string): Promise<VaultRecord | null> {
  return getJSON<VaultRecord>(vaultKey(vaultId));
}

export async function saveVault(vault: VaultRecord): Promise<void> {
  vault.updatedAt = new Date().toISOString();
  await putJSON(vaultKey(vault.id), vault);
}

export async function getOrCreateAnonVault(
  sessionId: string,
): Promise<VaultRecord> {
  const index = await loadIndex();
  const mapped = index.sessions[sessionId];
  if (mapped) {
    const existing = await loadVault(mapped.vaultId);
    if (existing) return existing;
  }
  const vault = emptyVault(anonVaultId(sessionId), "anon", sessionId);
  index.sessions[sessionId] = { vaultId: vault.id };
  await saveVault(vault);
  await saveIndex(index);
  return vault;
}

export async function attachEmail(
  sessionId: string,
  email: string,
): Promise<VaultRecord> {
  const anon = await getOrCreateAnonVault(sessionId);
  const targetId = emailVaultId(email);
  let target = await loadVault(targetId);
  if (!target) {
    target = emptyVault(targetId, "email", sessionId, email);
  }
  target.kind = "email";
  target.email = email;
  target.sessionId = sessionId;

  const seen = new Set(target.captures.map((c) => c.id));
  for (const capture of anon.captures) {
    if (seen.has(capture.id)) continue;
    target.captures.push({ ...capture, vaultId: target.id });
    seen.add(capture.id);
  }
  target.captureIds = target.captures.map((c) => c.id);

  const storySeen = new Set(target.stories.map((s) => s.id));
  for (const story of anon.stories) {
    if (storySeen.has(story.id)) continue;
    target.stories.push({ ...story, vaultId: target.id });
    storySeen.add(story.id);
  }

  if (anon.id !== target.id) {
    anon.email = email;
    await saveVault(anon);
  }
  await saveVault(target);

  const index = await loadIndex();
  index.sessions[sessionId] = { vaultId: target.id, email };
  await saveIndex(index);
  return target;
}

export async function addCapture(
  vault: VaultRecord,
  capture: Omit<CaptureRecord, "vaultId">,
): Promise<CaptureRecord> {
  const record: CaptureRecord = { ...capture, vaultId: vault.id };
  vault.captures.push(record);
  vault.captureIds = vault.captures.map((c) => c.id);
  await saveVault(vault);
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
  await saveVault(vault);
  return vault.captures[idx];
}

export async function addStory(
  vault: VaultRecord,
  story: Omit<StoryRecord, "vaultId">,
): Promise<StoryRecord> {
  const record: StoryRecord = { ...story, vaultId: vault.id };
  vault.stories.unshift(record);
  await saveVault(vault);
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
  return vault.stories.find((s) => s.day === day) ?? lastStory(vault);
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
