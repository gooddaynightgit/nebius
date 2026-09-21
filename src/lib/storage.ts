import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import {
  BlobNotFoundError,
  get as getBlob,
  head as headBlob,
  list as listBlob,
  put as putBlob,
  type PutBlobResult,
} from "@vercel/blob";
import { mkdir, readFile, writeFile } from "node:fs/promises";
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

function blobPath(key: string): string {
  return `${prefix()}/${key.replace(/^\//, "")}`;
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

async function lookupBlobUrl(pathname: string): Promise<string | null> {
  const cached = blobUrlByPath.get(pathname);
  if (cached) return cached;
  try {
    const meta = await headBlob(pathname, blobAuth());
    if (meta?.url) {
      rememberBlobUrl(pathname, meta.url);
      return meta.url;
    }
  } catch (error) {
    if (!isBlobMissingError(error)) {
      logBlob("head", pathname, error);
      throw error;
    }
  }
  try {
    const listed = await listBlob({ prefix: pathname, limit: 20, ...blobAuth() });
    const match = listed.blobs.find(
      (blob) => normalizeListedPath(blob.pathname) === pathname,
    );
    if (match?.url) {
      rememberBlobUrl(pathname, match.url);
      return match.url;
    }
  } catch (error) {
    if (!isBlobMissingError(error)) {
      logBlob("list", pathname, error);
      throw error;
    }
  }
  return null;
}

async function readBlobResult(
  target: string,
  key: string,
): Promise<StoredBlob | null> {
  const result = await getBlob(target, {
    access: blobAccess(),
    useCache: false,
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

async function getBlobBytes(key: string): Promise<StoredBlob | null> {
  const pathname = blobPath(key);
  const targets = unique([
    blobUrlByPath.get(pathname),
    blobCdnUrl(pathname),
  ]);

  let lastError: unknown;
  for (const target of targets) {
    try {
      const file = await readBlobResult(target, key);
      if (file) return file;
    } catch (error) {
      if (isBlobMissingError(error)) continue;
      lastError = error;
      logBlob("get", pathname, error);
      throw error;
    }
  }

  try {
    const url = await lookupBlobUrl(pathname);
    if (url && !targets.includes(url)) {
      const file = await readBlobResult(url, key);
      if (file) return file;
    }
  } catch (error) {
    if (!isBlobMissingError(error)) {
      lastError = error;
      logBlob("get", pathname, error);
      throw error;
    }
  }

  if (lastError) throw lastError;
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
        Key: `${prefix()}/${key}`,
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
): Promise<StoredBlob | null> {
  if (hasVercelBlob()) {
    return getBlobBytes(key);
  }
  if (hasNebiusObjectStorage()) {
    const { client, bucket } = s3();
    try {
      const res = await client.send(
        new GetObjectCommand({
          Bucket: bucket,
          Key: `${prefix()}/${key}`,
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

export async function putJSON(key: string, value: unknown): Promise<void> {
  await putBytes(key, JSON.stringify(value, null, 2), "application/json");
}

export async function getJSON<T>(key: string): Promise<T | null> {
  const file = await getBytes(key);
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

export function storageBackend(): StorageBackend {
  if (hasVercelBlob()) return "vercel-blob";
  if (hasNebiusObjectStorage()) return "nebius-s3";
  if (process.env.VERCEL) return "ephemeral";
  return "filesystem";
}
