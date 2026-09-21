import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type Stored = {
  body: Buffer;
  contentType: string;
  pathname: string;
  url: string;
};

const blobState = vi.hoisted(() => {
  class BlobNotFoundError extends Error {
    constructor() {
      super("Vercel Blob: The requested blob does not exist");
      this.name = "BlobNotFoundError";
    }
  }

  function streamOf(body: Buffer): ReadableStream<Uint8Array> {
    return new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array(body));
        controller.close();
      },
    });
  }

  function actualUrl(pathname: string): string {
    return `https://actualstore.private.blob.vercel-storage.com/${pathname}`;
  }

  return {
    byUrl: new Map<string, Stored>(),
    BlobNotFoundError,
    streamOf,
    actualUrl,
  };
});

vi.mock("@vercel/blob", () => ({
  BlobNotFoundError: blobState.BlobNotFoundError,
  put: vi.fn(async (pathname: string, body: string | Uint8Array, options: { contentType: string }) => {
    const bytes = typeof body === "string" ? Buffer.from(body) : Buffer.from(body);
    const url = blobState.actualUrl(pathname);
    blobState.byUrl.set(url, {
      body: bytes,
      contentType: options.contentType,
      pathname,
      url,
    });
    return { url, pathname, contentType: options.contentType };
  }),
  get: vi.fn(async (urlOrPathname: string) => {
    // Pathname-only private gets miss — this is the production failure mode.
    if (!urlOrPathname.startsWith("http://") && !urlOrPathname.startsWith("https://")) {
      return null;
    }
    const rec = blobState.byUrl.get(urlOrPathname.split("?")[0] ?? urlOrPathname);
    if (!rec) return null;
    return {
      statusCode: 200,
      stream: blobState.streamOf(rec.body),
      blob: {
        contentType: rec.contentType,
        url: rec.url,
        pathname: rec.pathname,
      },
    };
  }),
  head: vi.fn(async (urlOrPathname: string) => {
    const rec = urlOrPathname.startsWith("http")
      ? blobState.byUrl.get(urlOrPathname)
      : [...blobState.byUrl.values()].find((item) => item.pathname === urlOrPathname);
    if (!rec) throw new blobState.BlobNotFoundError();
    return { url: rec.url, pathname: rec.pathname, contentType: rec.contentType };
  }),
  list: vi.fn(async (options?: { prefix?: string }) => {
    const blobs = [...blobState.byUrl.values()].filter(
      (item) => !options?.prefix || item.pathname.startsWith(options.prefix),
    );
    return {
      blobs: blobs.map((item) => ({ url: item.url, pathname: item.pathname })),
      hasMore: false,
    };
  }),
}));

import { get as getBlob } from "@vercel/blob";
import {
  getBytes,
  getJSON,
  probeVercelBlob,
  putBytes,
  putJSON,
  resetBlobUrlCache,
} from "./storage";
import { addCapture, getOrCreateAnonVault } from "./vault";

const TOKEN = "vercel_blob_rw_teststore_30FakeRandomCharacters12345678";

describe("vercel blob round-trip", () => {
  const original = { ...process.env };

  beforeEach(() => {
    blobState.byUrl.clear();
    resetBlobUrlCache();
    process.env.BLOB_READ_WRITE_TOKEN = TOKEN;
    process.env.BLOB_ACCESS = "private";
    delete process.env.BLOB_STORE_ID;
    delete process.env.VERCEL;
    delete process.env.NEBIUS_S3_BUCKET;
    delete process.env.NEBIUS_S3_ACCESS_KEY_ID;
    delete process.env.NEBIUS_S3_SECRET_ACCESS_KEY;
    delete process.env.NEBIUS_S3_ENDPOINT;
  });

  afterEach(() => {
    process.env = { ...original };
    blobState.byUrl.clear();
    resetBlobUrlCache();
    vi.mocked(getBlob).mockClear();
  });

  it("putJSON then getJSON returns the same payload using the put URL", async () => {
    const payload = { id: "vault-1", captureCount: 1, joy: "sky" };
    await putJSON("vaults/anon_session/vault.json", payload);
    const read = await getJSON<typeof payload>("vaults/anon_session/vault.json");
    expect(read).toEqual(payload);
    expect(vi.mocked(getBlob).mock.calls.length).toBeGreaterThan(0);
    expect(
      vi.mocked(getBlob).mock.calls.every(([target]) => String(target).startsWith("https://")),
    ).toBe(true);
  });

  it("reads bytes back after the in-process URL cache is cleared", async () => {
    const bytes = Buffer.from([0xff, 0xd8, 0xff, 0x01, 0x02]);
    await putBytes("vaults/anon_session/media/cap.jpg", bytes, "image/jpeg");
    resetBlobUrlCache();
    const file = await getBytes("vaults/anon_session/media/cap.jpg");
    expect(file).not.toBeNull();
    expect(file?.contentType).toBe("image/jpeg");
    expect(file?.body.equals(bytes)).toBe(true);
  });

  it("does not treat a blob 500 as a missing object", async () => {
    await putJSON("index/sessions.json", { sessions: {} });
    vi.mocked(getBlob).mockRejectedValueOnce(
      new Error("Vercel Blob: Failed to fetch blob: 500 Internal Server Error"),
    );
    await expect(getJSON("index/sessions.json")).rejects.toThrow(/500/);
  });

  it("returns null only when the blob is truly missing", async () => {
    await expect(getJSON("vaults/nobody/vault.json")).resolves.toBeNull();
  });

  it("probeVercelBlob reports ok after a successful round-trip", async () => {
    await expect(probeVercelBlob()).resolves.toEqual({ ok: true });
  });

  it("getOrCreateAnonVault still sees a capture after a fresh blob read", async () => {
    const vault = await getOrCreateAnonVault("session-blob-persist");
    await addCapture(vault, {
      id: "cap_test",
      kind: "photo",
      createdAt: "2026-09-21T10:00:00.000Z",
      day: "2026-09-21",
      caption: "sky",
      joyType: "sky",
      source: "app",
      mediaKey: "vaults/anon_session-blob-persist/media/cap_test.jpg",
      ingestStatus: "ok",
    });
    resetBlobUrlCache();

    const again = await getOrCreateAnonVault("session-blob-persist");
    expect(again.captures).toHaveLength(1);
    expect(again.captures[0]?.id).toBe("cap_test");
    expect(again.captures[0]?.joyType).toBe("sky");
  });
});
