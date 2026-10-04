import {
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import {
  BlobNotFoundError,
  del as deleteBlob,
  get as getBlob,
  list as listBlob,
  put as putBlob,
  type PutBlobResult,
} from "@vercel/blob";
import { mkdir, readdir, readFile, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  blobAccess,
  dataDir,
  hasNebiusObjectStorage,
  hasVercelBlob,
} from "./config";

export type StorageBackend =
  | "vercel-blob"
  | "nebius-s3"
  | "filesystem"
  | "ephemeral";

type BlobAuth = { token: string } | { storeId: string } | Record<string, never>;

type StoredBlob = { body: Buffer; contentType: string };

const blobUrlByPath = new Map<string, string>();

function prefix(): string {
  return (process.env.NEBIUS_S3_PREFIX ?? "gooddaynight").replace(/\/+$/, "");
}

/** Store key for an app key. An empty prefix is the store root, not a leading slash. */
function storedKey(key: string): string {
  const bare = key.replace(/^\//, "");
  const root = prefix();
  return root ? `${root}/${bare}` : bare;
}

function blobPath(key: string): string {
  return storedKey(key);
}

function normalizeStoreId(storeId: string): string {
  return storeId.startsWith("store_") ? storeId.slice("store_".length) : storeId;
}

function readWriteStoreId(token: string): string | null {
  const parts = token.split("_");
  // vercel_blob_rw_<storeId>_<secret>
  return parts[3] || null;
}

function blobAuth(): BlobAuth {
  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (token) return { token };
  const storeId = process.env.BLOB_STORE_ID?.trim();
  if (storeId) return { storeId: normalizeStoreId(storeId) };
  return {};
}

function blobCdnUrl(pathname: string): string | null {
  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  const fromToken = token ? readWriteStoreId(token) : null;
  const fromEnv = process.env.BLOB_STORE_ID?.trim();
  const storeId = fromToken || (fromEnv ? normalizeStoreId(fromEnv) : null);
  if (!storeId) return null;
  return `https://${storeId}.${blobAccess()}.blob.vercel-storage.com/${pathname.replace(/^\//, "")}`;
}

function rememberBlobUrl(pathname: string, url: string): void {
  if (pathname && url) blobUrlByPath.set(pathname, url);
}

export function resetBlobUrlCache(): void {
  blobUrlByPath.clear();
}

function logBlob(op: string, pathname: string, error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[storage] vercel-blob ${op} failed path=${pathname} ${message}`);
}

function isBlobMissingError(error: unknown): boolean {
  if (error instanceof BlobNotFoundError) return true;
  const name = error instanceof Error ? error.name : "";
  if (name === "BlobNotFoundError") return true;
  const message = error instanceof Error ? error.message : String(error);
  return /blob does not exist|not found/i.test(message) && !/\b(401|403|500)\b/.test(message);
}

function s3(): { client: S3Client; bucket: string } {
  const client = new S3Client({
    region: process.env.NEBIUS_S3_REGION ?? "eu-north1",
    endpoint: process.env.NEBIUS_S3_ENDPOINT,
    credentials: {
      accessKeyId: process.env.NEBIUS_S3_ACCESS_KEY_ID ?? "",
      secretAccessKey: process.env.NEBIUS_S3_SECRET_ACCESS_KEY ?? "",
    },
    forcePathStyle: true,
  });
  return { client, bucket: process.env.NEBIUS_S3_BUCKET ?? "" };
}

function localPath(key: string): string {
  return path.join(dataDir(), key.replace(/^\//, ""));
}

async function ensureParent(filePath: string): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
}

async function streamToBuffer(stream: ReadableStream<Uint8Array>): Promise<Buffer> {
  // Prefer the stream reader. `new Response(undiciStream)` can throw when
  // @vercel/blob's bundled undici ReadableStream is not the same class as
  // the runtime's, which previously made every blob get look like a miss.
  if (stream && typeof stream.getReader === "function") {
    const reader = stream.getReader();
    const chunks: Uint8Array[] = [];
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) chunks.push(value);
    }
    return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)));
  }
  const iterable = stream as unknown as AsyncIterable<Uint8Array>;
  const chunks: Buffer[] = [];
  for await (const chunk of iterable) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

function unique(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

function normalizeListedPath(pathname: string): string {
  return pathname.replace(/^\//, "");
}

export type BlobReadOptions = {
  /** Opt in to Vercel's blob CDN cache. Default reads stay uncached. */
  cache?: boolean;
};

async function readBlobResult(
  target: string,
  key: string,
  cache: boolean,
): Promise<StoredBlob | null> {
  const result = await getBlob(target, {
    access: blobAccess(),
    useCache: cache,
    ...blobAuth(),
  });
  if (!result) return null;
  if (result.statusCode !== 200 || !result.stream) {
    logBlob("get", blobPath(key), `status ${result.statusCode}`);
    return null;
  }
  if (result.blob?.url) rememberBlobUrl(blobPath(key), result.blob.url);
  return {
    body: await streamToBuffer(result.stream),
    contentType: result.blob.contentType || guessContentType(key),
  };
}

async function putBlobBytes(
  key: string,
  body: Buffer | Uint8Array | string,
  contentType: string,
): Promise<PutBlobResult> {
  const pathname = blobPath(key);
  const bytes = typeof body === "string" ? body : Buffer.from(body);
  try {
    const result = await putBlob(pathname, bytes, {
      access: blobAccess(),
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType,
      cacheControlMaxAge: contentType.includes("json") ? 60 : 60 * 60,
      ...blobAuth(),
    });
    rememberBlobUrl(pathname, result.url);
    return result;
  } catch (error) {
    logBlob("put", pathname, error);
    throw error;
  }
}

async function getBlobBytes(key: string, cache: boolean): Promise<StoredBlob | null> {
  const pathname = blobPath(key);
  const targets = unique([
    blobUrlByPath.get(pathname),
    blobCdnUrl(pathname),
  ]);

  for (const target of targets) {
    try {
      const file = await readBlobResult(target, key, cache);
      if (file) return file;
    } catch (error) {
      if (isBlobMissingError(error)) continue;
      logBlob("get", pathname, error);
      throw error;
    }
  }

  // An exact-path get that 404s is a miss. Do not head() or list() to recover.
  return null;
}

export async function putBytes(
  key: string,
  body: Buffer | Uint8Array | string,
  contentType: string,
): Promise<void> {
  if (hasVercelBlob()) {
    await putBlobBytes(key, body, contentType);
    return;
  }
  if (hasNebiusObjectStorage()) {
    const { client, bucket } = s3();
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: storedKey(key),
        Body: body,
        ContentType: contentType,
      }),
    );
    return;
  }
  const filePath = localPath(key);
  await ensureParent(filePath);
  await writeFile(filePath, body);
}

export async function getBytes(
  key: string,
  options?: BlobReadOptions,
): Promise<StoredBlob | null> {
  if (hasVercelBlob()) {
    return getBlobBytes(key, options?.cache === true);
  }
  if (hasNebiusObjectStorage()) {
    const { client, bucket } = s3();
    try {
      const res = await client.send(
        new GetObjectCommand({
          Bucket: bucket,
          Key: storedKey(key),
        }),
      );
      const bytes = await res.Body?.transformToByteArray();
      if (!bytes) return null;
      return {
        body: Buffer.from(bytes),
        contentType: res.ContentType ?? "application/octet-stream",
      };
    } catch (error) {
      const name = error instanceof Error ? error.name : "";
      if (name === "NoSuchKey" || name === "NotFound") return null;
      console.error(`[storage] s3 get failed key=${key}`, error);
      throw error;
    }
  }
  try {
    const body = await readFile(localPath(key));
    return { body, contentType: guessContentType(key) };
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return null;
    throw error;
  }
}

export async function deleteBytes(key: string): Promise<void> {
  if (!key) return;
  if (hasVercelBlob()) {
    await deleteBlobBytes(key);
    return;
  }
  if (hasNebiusObjectStorage()) {
    const { client, bucket } = s3();
    try {
      await client.send(
        new DeleteObjectCommand({
          Bucket: bucket,
          Key: storedKey(key),
        }),
      );
    } catch (error) {
      const name = error instanceof Error ? error.name : "";
      if (name === "NoSuchKey" || name === "NotFound") return;
      console.error(`[storage] s3 delete failed key=${key}`, error);
      throw error;
    }
    return;
  }
  try {
    await unlink(localPath(key));
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return;
    throw error;
  }
}

async function deleteBlobBytes(key: string): Promise<void> {
  const pathname = blobPath(key);
  const url = blobUrlByPath.get(pathname) || blobCdnUrl(pathname);
  if (!url) {
    logBlob("del", pathname, "missing url");
    return;
  }
  const auth = blobAuth();
  const token = "token" in auth ? auth.token : undefined;
  try {
    await deleteBlob(url, token ? { token } : {});
    blobUrlByPath.delete(pathname);
  } catch (error) {
    if (isBlobMissingError(error)) {
      blobUrlByPath.delete(pathname);
      return;
    }
    logBlob("del", pathname, error);
    throw error;
  }
}

export async function putJSON(key: string, value: unknown): Promise<void> {
  await putBytes(key, JSON.stringify(value, null, 2), "application/json");
}

export async function getJSON<T>(key: string, options?: BlobReadOptions): Promise<T | null> {
  const file = await getBytes(key, options);
  if (!file) return null;
  try {
    return JSON.parse(file.body.toString("utf8")) as T;
  } catch (error) {
    console.error(`[storage] invalid JSON key=${key}`);
    throw error instanceof Error ? error : new Error(`invalid JSON at ${key}`);
  }
}

export async function probeVercelBlob(): Promise<{
  ok: boolean;
  error?: string;
}> {
  if (!hasVercelBlob()) return { ok: false, error: "not-configured" };
  const key = "health/blob-roundtrip.json";
  const payload = { probe: true, at: new Date().toISOString() };
  try {
    await putJSON(key, payload);
    const read = await getJSON<{ probe?: boolean; at?: string }>(key);
    if (!read || read.probe !== true || read.at !== payload.at) {
      return { ok: false, error: "roundtrip-mismatch" };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "roundtrip-failed" };
  }
}

function guessContentType(key: string): string {
  if (key.endsWith(".json")) return "application/json";
  if (key.endsWith(".mp3")) return "audio/mpeg";
  if (key.endsWith(".wav")) return "audio/wav";
  if (key.endsWith(".webm")) return "audio/webm";
  if (key.endsWith(".png")) return "image/png";
  if (key.endsWith(".jpg") || key.endsWith(".jpeg")) return "image/jpeg";
  if (key.endsWith(".webp")) return "image/webp";
  return "application/octet-stream";
}

export type ListedObject = {
  key: string;
  /** Byte size from list metadata. Absent when the backend did not report one. */
  size?: number;
  /** Last write time from list metadata, ISO-8601. */
  uploadedAt?: string;
};

export type ListKeysResult = {
  keys: string[];
  objects: ListedObject[];
  cursor?: string;
};

/** Page through stored objects. Keys are app-relative (`vaults/...`), cursors are backend-specific. */
export async function listKeys(options: {
  prefix: string;
  cursor?: string;
  limit?: number;
}): Promise<ListKeysResult> {
  const limit = Math.min(Math.max(options.limit ?? 1000, 1), 1000);
  const prefixKey = options.prefix.replace(/^\//, "");
  if (hasVercelBlob()) return listBlobKeys(prefixKey, options.cursor, limit);
  if (hasNebiusObjectStorage()) return listS3Keys(prefixKey, options.cursor, limit);
  return listLocalKeys(prefixKey, options.cursor, limit);
}

function appKeyFromStoredPath(stored: string): string | null {
  const normalized = normalizeListedPath(stored);
  const root = prefix();
  if (!root) return normalized || null;
  const head = `${root}/`;
  if (!normalized.startsWith(head)) return null;
  const key = normalized.slice(head.length);
  return key || null;
}

async function listBlobKeys(
  prefixKey: string,
  cursor: string | undefined,
  limit: number,
): Promise<ListKeysResult> {
  const listed = await listBlob({
    prefix: blobPath(prefixKey),
    cursor,
    limit,
    ...blobAuth(),
  });
  const objects: ListedObject[] = [];
  for (const blob of listed.blobs) {
    const key = appKeyFromStoredPath(blob.pathname);
    if (!key) continue;
    const uploadedAt =
      blob.uploadedAt instanceof Date
        ? blob.uploadedAt.toISOString()
        : typeof blob.uploadedAt === "string"
          ? blob.uploadedAt
          : undefined;
    objects.push({
      key,
      size: typeof blob.size === "number" ? blob.size : undefined,
      uploadedAt,
    });
  }
  return {
    keys: objects.map((item) => item.key),
    objects,
    cursor: listed.hasMore && listed.cursor ? listed.cursor : undefined,
  };
}

async function listS3Keys(
  prefixKey: string,
  cursor: string | undefined,
  limit: number,
): Promise<ListKeysResult> {
  const { client, bucket } = s3();
  const listed = await client.send(
    new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: storedKey(prefixKey),
      ContinuationToken: cursor,
      MaxKeys: limit,
    }),
  );
  const objects: ListedObject[] = [];
  for (const item of listed.Contents ?? []) {
    const key = item.Key ? appKeyFromStoredPath(item.Key) : null;
    if (!key) continue;
    objects.push({
      key,
      size: typeof item.Size === "number" ? item.Size : undefined,
      uploadedAt: item.LastModified ? item.LastModified.toISOString() : undefined,
    });
  }
  return {
    keys: objects.map((item) => item.key),
    objects,
    cursor: listed.IsTruncated && listed.NextContinuationToken ? listed.NextContinuationToken : undefined,
  };
}

async function listLocalKeys(
  prefixKey: string,
  cursor: string | undefined,
  limit: number,
): Promise<ListKeysResult> {
  const root = localPath(prefixKey);
  const files: string[] = [];
  await walkLocalFiles(root, files);
  const base = dataDir();
  const keys = files
    .map((file) => path.relative(base, file).split(path.sep).join("/"))
    .filter((key) => key && !key.startsWith(".."))
    .sort();
  let start = 0;
  if (cursor) {
    const next = keys.findIndex((key) => key > cursor);
    start = next === -1 ? keys.length : next;
  }
  const page = keys.slice(start, start + limit);
  const objects: ListedObject[] = [];
  for (const key of page) {
    try {
      const info = await stat(localPath(key));
      objects.push({ key, size: info.size, uploadedAt: info.mtime.toISOString() });
    } catch {
      objects.push({ key });
    }
  }
  const more = start + limit < keys.length;
  return {
    keys: page,
    objects,
    cursor: more && page.length ? page[page.length - 1] : undefined,
  };
}

async function walkLocalFiles(dir: string, out: string[]): Promise<void> {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return;
    throw error;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walkLocalFiles(full, out);
      continue;
    }
    if (entry.isFile()) out.push(full);
  }
}

export function storageBackend(): StorageBackend {
  if (hasVercelBlob()) return "vercel-blob";
  if (hasNebiusObjectStorage()) return "nebius-s3";
  if (process.env.VERCEL) return "ephemeral";
  return "filesystem";
}
