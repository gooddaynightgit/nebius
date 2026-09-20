import { afterEach, describe, expect, it } from "vitest";
import { storageBackend } from "./storage";

describe("storage backend", () => {
  const original = { ...process.env };

  afterEach(() => {
    process.env = { ...original };
  });

  it("prefers Vercel Blob when the token is set", () => {
    process.env.BLOB_READ_WRITE_TOKEN = "vercel_blob_rw_test";
    process.env.NEBIUS_S3_BUCKET = "bucket";
    process.env.NEBIUS_S3_ACCESS_KEY_ID = "id";
    process.env.NEBIUS_S3_SECRET_ACCESS_KEY = "secret";
    process.env.NEBIUS_S3_ENDPOINT = "https://storage.eu-north1.nebius.cloud";
    expect(storageBackend()).toBe("vercel-blob");
  });

  it("uses Nebius S3 when Blob is unset and S3 is configured", () => {
    delete process.env.BLOB_READ_WRITE_TOKEN;
    delete process.env.BLOB_STORE_ID;
    delete process.env.VERCEL;
    process.env.NEBIUS_S3_BUCKET = "bucket";
    process.env.NEBIUS_S3_ACCESS_KEY_ID = "id";
    process.env.NEBIUS_S3_SECRET_ACCESS_KEY = "secret";
    process.env.NEBIUS_S3_ENDPOINT = "https://storage.eu-north1.nebius.cloud";
    expect(storageBackend()).toBe("nebius-s3");
  });

  it("reports ephemeral on Vercel without Blob or S3", () => {
    delete process.env.BLOB_READ_WRITE_TOKEN;
    delete process.env.BLOB_STORE_ID;
    delete process.env.NEBIUS_S3_BUCKET;
    delete process.env.NEBIUS_S3_ACCESS_KEY_ID;
    delete process.env.NEBIUS_S3_SECRET_ACCESS_KEY;
    delete process.env.NEBIUS_S3_ENDPOINT;
    process.env.VERCEL = "1";
    expect(storageBackend()).toBe("ephemeral");
  });
});
