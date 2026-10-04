import { describe, expect, it, vi } from "vitest";
import { emailVaultId as appEmailVaultId } from "./identity";
import {
  emailVaultId,
  keepReason,
  main,
  parseArgs,
  runCleanup,
} from "../../scripts/cleanup-empty-vaults.mjs";

const NOW = new Date("2026-10-04T00:00:00.000Z");
const OLD = "2026-08-01T00:00:00.000Z";
const RECENT = "2026-10-03T00:00:00.000Z";

describe("empty vault cleanup", () => {
  it("matches the app email vault id and stays dry unless --delete is set", () => {
    expect(emailVaultId("Amy@Email.com")).toBe(appEmailVaultId("amy@email.com"));
    expect(parseArgs([])).toEqual({ deleteMode: false, unexpected: [] });
    expect(parseArgs(["--delete"])).toEqual({ deleteMode: true, unexpected: [] });
  });

  it("refuses to run without a token", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      expect(await main([], {})).toBe(1);
      expect(error).toHaveBeenCalledWith("BLOB_READ_WRITE_TOKEN is not set.");
    } finally {
      error.mockRestore();
    }
  });

  it("counts keep reasons and lists empty pathnames without deleting", async () => {
    const files = sampleFiles();
    const client = memoryClient(files);
    const lines: string[] = [];
    const result = await runCleanup({
      client,
      token: "vercel_blob_rw_teststore_secret",
      prefix: "gooddaynight",
      deleteMode: false,
      now: NOW,
      log: (line) => lines.push(line),
    });

    expect(result.wouldDelete).toBe(1);
    expect(result.deleted).toBe(0);
    expect(client.dels).toEqual([]);
    expect(client.puts).toEqual([]);
    expect(client.gets.every((call) => call.options.useCache === false)).toBe(true);
    expect(lines).toContain("total vaults: 11");
    expect(lines).toContain("would delete: 1");
    expect(lines).toContain("  captures: 1");
    expect(lines).toContain("  email: 3");
    expect(lines).toContain("  media: 1");
    expect(lines).toContain("  other-data: 1");
    expect(lines).toContain("  payfast-order: 1");
    expect(lines).toContain("  recent: 1");
    expect(lines).toContain("  stories: 1");
    expect(lines).toContain("  unknown-age: 1");
    expect(lines).toContain("  gooddaynight/vaults/anon_empty/vault.json");
    expect(files.some((file) => file.pathname.endsWith("/anon_empty/vault.json"))).toBe(true);
  });

  it("deletes only that vault's files and its index rows", async () => {
    const files = [
      file("vaults/anon_empty/vault.json", emptyVault("empty", OLD), OLD),
      file("vaults/anon_keep/vault.json", emptyVault("keep", OLD, { stories: [{ day: "2026-08-01" }] }), OLD),
      file("payfast/orders/pay_keep.json", JSON.stringify({ email: "amy@example.com", status: "complete" }), OLD),
      file(
        "index/sessions.json",
        JSON.stringify({
          sessions: {
            "session-empty": { vaultId: "anon_empty" },
            "session-keep": { vaultId: "anon_keep" },
          },
        }),
        OLD,
      ),
    ];
    const client = memoryClient(files);
    const lines: string[] = [];
    await runCleanup({
      client,
      token: "vercel_blob_rw_teststore_secret",
      prefix: "gooddaynight",
      deleteMode: true,
      now: NOW,
      log: (line) => lines.push(line),
    });

    expect(lines).toContain("deleted: 1");
    expect(client.dels).toEqual(["https://blob.test/gooddaynight/vaults/anon_empty/vault.json"]);
    expect(client.gets.every((call) => call.options.useCache === false)).toBe(true);
    const indexPut = client.puts.find((put) => put.pathname === "gooddaynight/index/sessions.json");
    expect(indexPut).toBeTruthy();
    const index = JSON.parse(String(indexPut?.body)) as {
      sessions: Record<string, { vaultId: string }>;
    };
    expect(index.sessions["session-empty"]).toBeUndefined();
    expect(index.sessions["session-keep"]?.vaultId).toBe("anon_keep");
    expect(files.map((item) => item.pathname).sort()).toEqual([
      "gooddaynight/index/sessions.json",
      "gooddaynight/payfast/orders/pay_keep.json",
      "gooddaynight/vaults/anon_keep/vault.json",
    ]);
  });

  it("keeps a vault when any delete check is unsure", () => {
    const now = NOW;
    const staleMs = 7 * 24 * 60 * 60 * 1000;
    const base = {
      vaultId: "anon_empty",
      vault: JSON.parse(emptyVault("empty", OLD)),
      now,
      staleMs,
      uploadedAt: OLD,
      siblingFiles: 0,
      linkedEmail: false,
      referencedByOrder: false,
    };
    expect(keepReason(base)).toBeNull();
    expect(keepReason({ ...base, uploadedAt: undefined })).toBe("unknown-age");
    expect(keepReason({ ...base, referencedByOrder: true })).toBe("payfast-order");
    expect(keepReason({ ...base, vault: { ...base.vault, paymentIds: ["pf"] } })).toBe("other-data");
  });
});

type StoredFile = { pathname: string; body: string; uploadedAt: string };

function file(key: string, body: string, uploadedAt: string): StoredFile {
  return { pathname: `gooddaynight/${key}`, body, uploadedAt };
}

function emptyVault(sessionId: string, updatedAt: string, extra: Record<string, unknown> = {}): string {
  return JSON.stringify(
    {
      id: `anon_${sessionId}`,
      kind: "anon",
      sessionId,
      createdAt: updatedAt,
      updatedAt,
      captureIds: [],
      stories: [],
      captures: [],
      ...extra,
    },
    null,
    2,
  );
}

function sampleFiles(): StoredFile[] {
  return [
    file("vaults/anon_empty/vault.json", emptyVault("empty", OLD), OLD),
    file("vaults/anon_recent/vault.json", emptyVault("recent", RECENT), RECENT),
    file("vaults/anon_story/vault.json", emptyVault("story", OLD, { stories: [{ id: "st", day: "2026-08-01" }] }), OLD),
    file(
      "vaults/anon_voice/vault.json",
      emptyVault("voice", OLD, {
        captures: [{ id: "cap", kind: "voice", caption: "the kettle", day: "2026-08-01" }],
      }),
      OLD,
    ),
    file("vaults/anon_mail/vault.json", emptyVault("mail", OLD, { email: "amy@example.com" }), OLD),
    file("vaults/em_aaaaaaaaaaaaaaaaaaaaaaaa/vault.json", emptyVault("ignored", OLD).replace("anon_ignored", "em_aaaaaaaaaaaaaaaaaaaaaaaa"), OLD),
    file("vaults/anon_linked/vault.json", emptyVault("linked", OLD), OLD),
    file("vaults/anon_media/vault.json", emptyVault("media", OLD), OLD),
    file("vaults/anon_media/media/photo.jpg", "bytes", OLD),
    file("vaults/anon_paid/vault.json", emptyVault("paid", OLD, { paymentIds: ["1089250"] }), OLD),
    file("vaults/anon_orderref/vault.json", emptyVault("orderref", OLD), OLD),
    file("vaults/anon_undated/vault.json", emptyVault("undated", OLD).replace(`"updatedAt": "${OLD}"`, '"updatedAt": ""'), OLD),
    file(
      "payfast/orders/pay_1.json",
      JSON.stringify({ email: "amy@example.com", status: "complete", note: "anon_orderref" }),
      OLD,
    ),
    file(
      "index/sessions.json",
      JSON.stringify({ sessions: { "session-linked": { vaultId: "anon_linked", email: "amy@example.com" } } }),
      OLD,
    ),
  ];
}

function memoryClient(files: StoredFile[]) {
  const gets: Array<{ url: string; options: { useCache?: boolean } }> = [];
  const puts: Array<{ pathname: string; body: string }> = [];
  const dels: string[] = [];
  return {
    gets,
    puts,
    dels,
    async list() {
      return {
        blobs: files.map((item) => ({
          url: `https://blob.test/${item.pathname}`,
          pathname: item.pathname,
          size: Buffer.byteLength(item.body),
          uploadedAt: new Date(item.uploadedAt),
        })),
        hasMore: false,
      };
    },
    async get(url: string, options: { useCache?: boolean }) {
      gets.push({ url, options });
      const found = files.find((item) => `https://blob.test/${item.pathname}` === url);
      if (!found) return null;
      const body = Buffer.from(found.body);
      return {
        statusCode: 200,
        stream: new ReadableStream({
          start(controller) {
            controller.enqueue(new Uint8Array(body));
            controller.close();
          },
        }),
      };
    },
    async put(pathname: string, body: string) {
      puts.push({ pathname, body });
      const found = files.find((item) => item.pathname === pathname);
      if (found) found.body = body;
      else files.push({ pathname, body, uploadedAt: NOW.toISOString() });
    },
    async del(url: string) {
      dels.push(url);
      const pathname = url.replace("https://blob.test/", "");
      const index = files.findIndex((item) => item.pathname === pathname);
      if (index >= 0) files.splice(index, 1);
    },
  };
}
