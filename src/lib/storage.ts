import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { get as getBlob, put as putBlob } from "@vercel/blob";
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

function prefix(): string {
  return (process.env.NEBIUS_S3_PREFIX ?? "gooddaynight").replace(/\/+$/, "");
}

function blobPath(key: string): string {
  return `${prefix()}/${key.replace(/^\//, "")}`;
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

async function streamToBuffer(
  stream: ReadableStream<Uint8Array>,
): Promise<Buffer> {
  return Buffer.from(await new Response(stream).arrayBuffer());
}

async function putBlobBytes(
  key: string,
  body: Buffer | Uint8Array | string,
  contentType: string,
): Promise<void> {
  const bytes = typeof body === "string" ? body : Buffer.from(body);
  await putBlob(blobPath(key), bytes, {
    access: blobAccess(),
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType,
  });
}

async function getBlobBytes(
  key: string,
): Promise<{ body: Buffer; contentType: string } | null> {
  const result = await getBlob(blobPath(key), {
    access: blobAccess(),
    useCache: false,
  });
  if (!result || result.statusCode !== 200 || !result.stream) return null;
  return {
    body: await streamToBuffer(result.stream),
    contentType: result.blob.contentType || guessContentType(key),
  };
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
): Promise<{ body: Buffer; contentType: string } | null> {
  if (hasVercelBlob()) {
    try {
      return await getBlobBytes(key);
    } catch {
      return null;
    }
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
    } catch {
      return null;
    }
  }
  try {
    const body = await readFile(localPath(key));
    return { body, contentType: guessContentType(key) };
  } catch {
    return null;
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
  } catch {
    return null;
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
