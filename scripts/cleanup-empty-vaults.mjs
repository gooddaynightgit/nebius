/**
 * One-time cleanup of empty anon vaults.
 *
 * Dry run unless --delete is passed. Does not prompt for tokens.
 * Reads BLOB_READ_WRITE_TOKEN from the environment.
 *
 *   node scripts/cleanup-empty-vaults.mjs
 *   node scripts/cleanup-empty-vaults.mjs --delete
 *
 * Vault, session index, and Payfast order reads are uncached.
 */
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const STALE_MS = 7 * 24 * 60 * 60 * 1000;
const KNOWN_KEYS = new Set([
  "id",
  "kind",
  "sessionId",
  "email",
  "createdAt",
  "updatedAt",
  "captureIds",
  "stories",
  "captures",
  "yoursOpened",
]);

export function emailVaultId(email) {
  const normalized = String(email ?? "").trim().toLowerCase();
  const hash = createHash("sha256").update(normalized).digest("hex").slice(0, 24);
  return `em_${hash}`;
}

export function storePrefix(env = process.env) {
  return (env.NEBIUS_S3_PREFIX ?? "gooddaynight").replace(/\/+$/, "");
}

export function appKey(pathname, prefix) {
  const normalized = String(pathname ?? "").replace(/^\//, "");
  const root = `${prefix}/`;
  if (!normalized.startsWith(root)) return null;
  const key = normalized.slice(root.length);
  return key || null;
}

function vaultIdFromKey(key) {
  const match = /^vaults\/([^/]+)\/vault\.json$/.exec(key);
  return match?.[1] ?? null;
}

function hasText(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function ageState(iso, now, staleMs) {
  if (typeof iso !== "string" || !iso.trim()) return "missing";
  const parsed = Date.parse(iso);
  if (!Number.isFinite(parsed)) return "missing";
  return now.getTime() - parsed < staleMs ? "recent" : "old";
}

/**
 * One keep-reason, or null when every delete criterion holds.
 * Unknown shape, unreadable age, email, payment, or an order reference is kept.
 */
export function keepReason(input) {
  const vault = input.vault;
  if (!vault || typeof vault !== "object" || Array.isArray(vault)) return "unreadable";
  const id = input.vaultId;
  if (!id || vault.id !== id) return "unreadable";
  if (!Array.isArray(vault.stories) || !Array.isArray(vault.captures)) return "unreadable";

  if (vault.stories.length > 0) return "stories";
  if (vault.captures.length > 0 || (Array.isArray(vault.captureIds) && vault.captureIds.length > 0)) {
    return "captures";
  }
  if (vault.yoursOpened && typeof vault.yoursOpened === "object" && Object.keys(vault.yoursOpened).length > 0) {
    return "opened";
  }
  if (hasText(vault.email) || vault.kind === "email" || id.startsWith("em_") || input.linkedEmail) {
    return "email";
  }
  const extra = Object.keys(vault).filter((key) => !KNOWN_KEYS.has(key));
  if (extra.length > 0) return "other-data";
  if (input.siblingFiles > 0) return "media";
  if (input.referencedByOrder) return "payfast-order";

  const updated = ageState(vault.updatedAt, input.now, input.staleMs);
  const uploaded = ageState(input.uploadedAt, input.now, input.staleMs);
  if (updated === "missing" || uploaded === "missing") return "unknown-age";
  if (updated === "recent" || uploaded === "recent") return "recent";
  return null;
}

function emptyCounts() {
  return {};
}

function bump(counts, reason) {
  counts[reason] = (counts[reason] ?? 0) + 1;
}

async function readBody(client, blob, token) {
  const result = await client.get(blob.url, {
    access: "private",
    token,
    useCache: false,
  });
  if (!result || result.statusCode !== 200 || !result.stream) return null;
  return readStream(result.stream);
}

async function readStream(stream) {
  if (stream && typeof stream.getReader === "function") {
    const reader = stream.getReader();
    const chunks = [];
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) chunks.push(Buffer.from(value));
    }
    return Buffer.concat(chunks).toString("utf8");
  }
  const chunks = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString("utf8");
}

async function listAll(client, prefix, token) {
  const blobs = [];
  let cursor;
  do {
    const page = await client.list({
      prefix: `${prefix}/`,
      cursor,
      limit: 1000,
      token,
    });
    blobs.push(...(page.blobs ?? []));
    cursor = page.hasMore && page.cursor ? page.cursor : undefined;
  } while (cursor);
  return blobs;
}

function isoFromUploadedAt(value) {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return value;
  return undefined;
}

/**
 * @param {object} options
 * @param {{ list: Function, get: Function, put: Function, del: Function }} options.client
 * @param {string} options.token
 * @param {string} options.prefix
 * @param {boolean} options.deleteMode
 * @param {Date} [options.now]
 * @param {(line: string) => void} [options.log]
 */
export async function runCleanup(options) {
  const now = options.now ?? new Date();
  const log = options.log ?? ((line) => console.log(line));
  const prefix = options.prefix;
  const token = options.token;
  const client = options.client;
  const blobs = await listAll(client, prefix, token);

  const files = [];
  for (const blob of blobs) {
    const key = appKey(blob.pathname, prefix);
    if (!key) continue;
    files.push({
      key,
      pathname: String(blob.pathname).replace(/^\//, ""),
      url: blob.url,
      uploadedAt: isoFromUploadedAt(blob.uploadedAt),
    });
  }

  const vaultFiles = files.filter((file) => vaultIdFromKey(file.key));
  const siblings = new Map();
  for (const file of files) {
    const match = /^vaults\/([^/]+)\//.exec(file.key);
    if (!match || file.key.endsWith("/vault.json")) continue;
    siblings.set(match[1], (siblings.get(match[1]) ?? 0) + 1);
  }

  let ordersUnreadable = false;
  const protectedIds = new Set();
  const orderFiles = files.filter((file) => file.key.startsWith("payfast/orders/") && file.key.endsWith(".json"));
  for (const file of orderFiles) {
    let text;
    try {
      text = await readBody(client, file, token);
    } catch {
      ordersUnreadable = true;
      continue;
    }
    if (text == null) {
      ordersUnreadable = true;
      continue;
    }
    let parsed = null;
    try {
      parsed = JSON.parse(text);
    } catch {
      ordersUnreadable = true;
      continue;
    }
    const email = parsed && typeof parsed.email === "string" ? parsed.email : "";
    if (email) protectedIds.add(emailVaultId(email));
    for (const vaultFile of vaultFiles) {
      const id = vaultIdFromKey(vaultFile.key);
      if (id && text.includes(id)) protectedIds.add(id);
    }
  }

  let indexUnreadable = false;
  let indexFile = files.find((file) => file.key === "index/sessions.json") ?? null;
  /** @type {Record<string, { vaultId?: string, email?: string }>} */
  let sessions = {};
  if (indexFile) {
    try {
      const text = await readBody(client, indexFile, token);
      if (text == null) indexUnreadable = true;
      else {
        const parsed = JSON.parse(text);
        if (!parsed || typeof parsed !== "object" || !parsed.sessions || typeof parsed.sessions !== "object") {
          indexUnreadable = true;
        } else {
          sessions = parsed.sessions;
        }
      }
    } catch {
      indexUnreadable = true;
    }
  }

  const linkedEmail = new Map();
  for (const entry of Object.values(sessions)) {
    if (!entry || typeof entry.vaultId !== "string") continue;
    if (typeof entry.email === "string" && entry.email.trim()) {
      linkedEmail.set(entry.vaultId, true);
      protectedIds.add(emailVaultId(entry.email));
    }
  }

  const kept = emptyCounts();
  const wouldDelete = [];
  let considered = 0;

  for (const file of vaultFiles) {
    const vaultId = vaultIdFromKey(file.key);
    if (!vaultId) continue;
    considered += 1;
    if (ordersUnreadable) {
      bump(kept, "orders-unreadable");
      continue;
    }
    if (indexUnreadable) {
      bump(kept, "index-unreadable");
      continue;
    }
    let text;
    try {
      text = await readBody(client, file, token);
    } catch {
      bump(kept, "unreadable");
      continue;
    }
    if (text == null) {
      bump(kept, "unreadable");
      continue;
    }
    let vault = null;
    try {
      vault = JSON.parse(text);
    } catch {
      bump(kept, "unreadable");
      continue;
    }
    const reason = keepReason({
      vaultId,
      vault,
      now,
      staleMs: STALE_MS,
      uploadedAt: file.uploadedAt,
      siblingFiles: siblings.get(vaultId) ?? 0,
      linkedEmail: linkedEmail.get(vaultId) === true,
      referencedByOrder: protectedIds.has(vaultId),
    });
    if (reason) {
      bump(kept, reason);
      continue;
    }
    wouldDelete.push({ ...file, vaultId });
  }

  log(`total vaults: ${considered}`);
  log(`would delete: ${wouldDelete.length}`);
  log("kept:");
  const reasons = Object.keys(kept).sort();
  if (!reasons.length) log("  (none)");
  for (const reason of reasons) log(`  ${reason}: ${kept[reason]}`);
  log("would delete:");
  if (!wouldDelete.length) log("  (none)");
  for (const file of wouldDelete) log(`  ${file.pathname}`);

  if (!options.deleteMode || !wouldDelete.length) {
    return { total: considered, wouldDelete: wouldDelete.length, deleted: 0, kept };
  }
  if (ordersUnreadable || indexUnreadable) {
    log("deleted: 0");
    return { total: considered, wouldDelete: 0, deleted: 0, kept };
  }

  const still = [];
  for (const file of wouldDelete) {
    let text;
    try {
      text = await readBody(client, file, token);
    } catch {
      continue;
    }
    if (text == null) continue;
    let vault = null;
    try {
      vault = JSON.parse(text);
    } catch {
      continue;
    }
    const reason = keepReason({
      vaultId: file.vaultId,
      vault,
      now,
      staleMs: STALE_MS,
      uploadedAt: file.uploadedAt,
      siblingFiles: siblings.get(file.vaultId) ?? 0,
      linkedEmail: linkedEmail.get(file.vaultId) === true,
      referencedByOrder: protectedIds.has(file.vaultId),
    });
    if (!reason) still.push(file);
  }

  if (indexFile && still.length) {
    const text = await readBody(client, indexFile, token);
    const parsed = JSON.parse(text);
    const removing = new Set(still.map((file) => file.vaultId));
    let changed = false;
    for (const [sessionId, entry] of Object.entries(parsed.sessions ?? {})) {
      if (entry && removing.has(entry.vaultId)) {
        delete parsed.sessions[sessionId];
        changed = true;
      }
    }
    if (changed) {
      await client.put(`${prefix}/index/sessions.json`, JSON.stringify(parsed, null, 2), {
        access: "private",
        token,
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: "application/json",
      });
    }
  }

  const deleting = new Set(still.map((file) => file.vaultId));
  let deleted = 0;
  for (const file of files) {
    const match = /^vaults\/([^/]+)\//.exec(file.key);
    if (!match || !deleting.has(match[1])) continue;
    if (!file.key.startsWith(`vaults/${match[1]}/`)) continue;
    await client.del(file.url, { token });
    deleted += 1;
  }
  log(`deleted: ${still.length}`);
  return { total: considered, wouldDelete: wouldDelete.length, deleted: still.length, kept, filesDeleted: deleted };
}

export function parseArgs(argv) {
  const deleteMode = argv.includes("--delete");
  const unexpected = argv.filter((arg) => arg !== "--delete");
  return { deleteMode, unexpected };
}

export async function main(argv = process.argv.slice(2), env = process.env) {
  const { deleteMode, unexpected } = parseArgs(argv);
  if (unexpected.length) {
    console.error("Usage: node scripts/cleanup-empty-vaults.mjs [--delete]");
    return 1;
  }
  const token = env.BLOB_READ_WRITE_TOKEN?.trim();
  if (!token) {
    console.error("BLOB_READ_WRITE_TOKEN is not set.");
    return 1;
  }
  const { del, get, list, put } = await import("@vercel/blob");
  await runCleanup({
    client: { del, get, list, put },
    token,
    prefix: storePrefix(env),
    deleteMode,
    now: new Date(),
  });
  return 0;
}

const entry = process.argv[1] ? fileURLToPath(import.meta.url) === process.argv[1] : false;
if (entry) {
  main()
    .then((code) => {
      if (code) process.exitCode = code;
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    });
}
