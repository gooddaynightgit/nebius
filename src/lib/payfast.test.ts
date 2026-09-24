import { createHash } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { emailVaultId } from "./identity";
import { getEntitlement } from "./entitlement";
import { MemoryFansTable, useFansTable } from "./fans";
import {
  FIELD_ORDER,
  ITEM_DESCRIPTION,
  ITEM_NAME,
  PACK_AMOUNT,
  PACK_MOMENTS,
  checkoutPairs,
  createCheckout,
  decideItn,
  handlePayfastItn,
  md5Hex,
  momentsForAmount,
  payfastProcessUrl,
  payfastSandbox,
  payfastValidateUrl,
  pfEncode,
  signCheckout,
  signPairs,
  signaturePayload,
} from "./payfast";

const ENV_KEYS = [
  "SANDBOX",
  "PF_MERCHANT_ID",
  "PF_MERCHANT_KEY",
  "PF_PASSPHRASE",
  "APP_URL",
  "VERCEL_URL",
  "DATA_DIR",
  "BLOB_READ_WRITE_TOKEN",
  "BLOB_STORE_ID",
  "VERCEL",
  "NEBIUS_S3_BUCKET",
  "NEBIUS_S3_ACCESS_KEY_ID",
  "NEBIUS_S3_SECRET_ACCESS_KEY",
  "NEBIUS_S3_ENDPOINT",
] as const;

describe("payfast signature", () => {
  it("signs checkout fields in documented order with uppercase quote_plus and passphrase last", () => {
    const fields = {
      amount: " 450.00 ",
      item_name: "Test Item",
      merchant_key: "46f0cd694581a",
      merchant_id: "10000100",
      return_url: "https://gooddaynight.com/moments?paid=1",
      item_description: "   ",
    };
    const payload =
      "merchant_id=10000100&merchant_key=46f0cd694581a&return_url=https%3A%2F%2Fgooddaynight.com%2Fmoments%3Fpaid%3D1&amount=450.00&item_name=Test+Item&passphrase=secret+passphrase";
    expect(signaturePayload(checkoutPairs(fields), " secret passphrase ")).toBe(payload);
    expect(signCheckout(fields, " secret passphrase ")).toBe(
      createHash("md5").update(payload).digest("hex"),
    );
    expect(signCheckout(fields, " secret passphrase ")).toBe(md5Hex(payload));
    expect(signCheckout(fields, " secret passphrase ")).toMatch(/^[0-9a-f]{32}$/);
    expect(FIELD_ORDER[0]).toBe("merchant_id");
    expect(FIELD_ORDER.indexOf("amount")).toBeGreaterThan(FIELD_ORDER.indexOf("notify_url"));
  });

  it("encodes like PHP urlencode: space is +, hex is uppercase, slash is escaped", () => {
    expect(pfEncode("a b")).toBe("a+b");
    expect(pfEncode("a/b")).toBe("a%2Fb");
    expect(pfEncode("~")).toBe("%7E");
    expect(pfEncode("ÿ")).toBe("%C3%BF");
    expect(pfEncode("  trim  ")).toBe("trim");
  });

  it("rebuilds an ITN signature from received order and skips the signature field", () => {
    const pairs: Array<[string, string]> = [
      ["amount_gross", "450.00"],
      ["signature", "not-this"],
      ["email_address", "amy@example.com"],
      ["item_description", ""],
      ["merchant_id", "10000100"],
    ];
    expect(signaturePayload(pairs, "salt")).toBe(
      "amount_gross=450.00&email_address=amy%40example.com&merchant_id=10000100&passphrase=salt",
    );
    expect(signaturePayload(pairs, "salt")).not.toContain("not-this");
    expect(signPairs(pairs, "salt")).toBe(md5Hex(signaturePayload(pairs, "salt")));
  });
});

describe("amount to moments", () => {
  it("credits 40 moments at 5.00 ZAR and 0 when the gross is under 5.00", () => {
    expect(PACK_AMOUNT).toBe("5.00");
    expect(PACK_MOMENTS).toBe(40);
    expect(momentsForAmount("5.00")).toBe(40);
    expect(momentsForAmount("5")).toBe(40);
    expect(momentsForAmount("5.01")).toBe(40);
    expect(momentsForAmount(5)).toBe(40);
    expect(momentsForAmount("4.99")).toBe(0);
    expect(momentsForAmount(4.99)).toBe(0);
    expect(momentsForAmount("0")).toBe(0);
    expect(momentsForAmount("")).toBe(0);
    expect(momentsForAmount("5.000")).toBe(0);
    expect(momentsForAmount("nope")).toBe(0);
  });
});

describe("payfast checkout and ITN", () => {
  let saved: Record<string, string | undefined>;
  let dir: string;

  beforeEach(() => {
    saved = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));
    for (const key of ENV_KEYS) delete process.env[key];
    dir = mkdtempSync(path.join(os.tmpdir(), "gdn-pf-"));
    process.env.DATA_DIR = dir;
    useFansTable(new MemoryFansTable());
    process.env.PF_MERCHANT_ID = "10000100";
    process.env.PF_MERCHANT_KEY = "46f0cd694581a";
    process.env.PF_PASSPHRASE = "test-passphrase";
    process.env.APP_URL = "https://gooddaynight.com";
  });

  afterEach(() => {
    for (const key of ENV_KEYS) {
      const value = saved[key];
      if (value == null) delete process.env[key];
      else process.env[key] = value;
    }
    useFansTable(null);
    rmSync(dir, { recursive: true, force: true });
  });

  it("defaults to live Payfast and returns an auto-submitting checkout for 5.00 ZAR", () => {
    expect(payfastSandbox()).toBe(false);
    expect(payfastProcessUrl()).toBe("https://www.payfast.co.za/eng/process");
    const result = createCheckout("Amy@Example.com");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.status).toBe(200);
    expect(result.html).toContain('action="https://www.payfast.co.za/eng/process"');
    expect(result.html).toContain('method="post"');
    expect(result.html).toContain('name="amount" value="5.00"');
    expect(result.html).toContain(`name="item_name" value="${ITEM_NAME}"`);
    expect(result.html).toContain(`name="item_description" value="${ITEM_DESCRIPTION}"`);
    expect(result.html).toContain('name="email_address" value="amy@example.com"');
    expect(result.html).toContain(`name="custom_str1" value="${emailVaultId("amy@example.com")}"`);
    expect(result.html).toContain("https://gooddaynight.com/api/payfast/itn");
    expect(result.html).toContain("https://gooddaynight.com/app?paid=1&amp;ref=");
    expect(result.html).toContain("https://gooddaynight.com/moments?cancelled=1");
    expect(result.html).not.toContain("/moments?paid=1");
    expect(result.html).toContain('document.getElementById("payfast-checkout").submit()');
    expect(result.html).not.toContain("test-passphrase");
    expect(result.html).not.toContain('name="passphrase"');

    const fields = hiddenFields(result.html);
    const signature = fields.signature;
    delete fields.signature;
    expect(signature).toBe(signCheckout(fields, "test-passphrase"));
  });

  it("uses the sandbox host only when SANDBOX is turned on", () => {
    process.env.SANDBOX = "true";
    expect(payfastSandbox()).toBe(true);
    expect(payfastProcessUrl()).toBe("https://sandbox.payfast.co.za/eng/process");
    expect(payfastValidateUrl()).toBe("https://sandbox.payfast.co.za/eng/query/validate");
    const result = createCheckout("amy@example.com");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.html).toContain('action="https://sandbox.payfast.co.za/eng/process"');
    expect(result.html).toContain('name="amount" value="5.00"');
  });

  it("refuses checkout without merchant secrets", () => {
    delete process.env.PF_PASSPHRASE;
    const result = createCheckout("amy@example.com");
    expect(result).toEqual({ ok: false, status: 500, message: "Payfast is not configured." });
  });

  it("credits 40 moments once when signature, VALID, and amount all pass", async () => {
    const raw = signedItn();
    let calls = 0;
    const fetchImpl: typeof fetch = async (input, init) => {
      calls += 1;
      expect(String(input)).toBe("https://www.payfast.co.za/eng/query/validate");
      expect(init?.method).toBe("POST");
      expect(init?.body).toBe(raw);
      return new Response("VALID", { status: 200 });
    };
    const first = await handlePayfastItn(raw, fetchImpl);
    expect(first).toEqual({ status: 200, body: "OK" });
    expect(calls).toBe(1);
    expect((await getEntitlement("amy@example.com"))?.remaining).toBe(40);

    const second = await handlePayfastItn(raw, fetchImpl);
    expect(second.status).toBe(200);
    expect((await getEntitlement("amy@example.com"))?.remaining).toBe(40);
    expect((await getEntitlement("amy@example.com"))?.paymentIds).toEqual(["1089250"]);
  });

  it("fails closed before fulfilment when the gross is under 5.00", async () => {
    const raw = signedItn({ amount_gross: "4.99" });
    let called = false;
    const fetchImpl: typeof fetch = async () => {
      called = true;
      return new Response("VALID", { status: 200 });
    };
    const result = await handlePayfastItn(raw, fetchImpl);
    expect(result.status).toBe(500);
    expect(called).toBe(false);
    expect(await getEntitlement("amy@example.com")).toBeNull();
    expect(decideItn(raw, "test-passphrase", "10000100").ok).toBe(false);
  });

  it("fails closed when the signature or Payfast validate check does not pass", async () => {
    const raw = signedItn();
    const tampered = raw.replace(`amount_gross=${PACK_AMOUNT}`, "amount_gross=5.01");
    let called = false;
    const fetchImpl: typeof fetch = async () => {
      called = true;
      return new Response("VALID", { status: 200 });
    };
    expect((await handlePayfastItn(tampered, fetchImpl)).status).toBe(500);
    expect(called).toBe(false);

    const rejected = await handlePayfastItn(raw, async () => new Response("INVALID", { status: 200 }));
    expect(rejected.status).toBe(500);
    expect(await getEntitlement("amy@example.com")).toBeNull();

    const thrown = await handlePayfastItn(raw, async () => {
      throw new Error("network");
    });
    expect(thrown.status).toBe(500);
    expect(await getEntitlement("amy@example.com")).toBeNull();
  });

  it("posts the raw ITN body to the live validate URL when sandbox is off", async () => {
    process.env.SANDBOX = "0";
    const raw = signedItn();
    let url = "";
    const result = await handlePayfastItn(raw, async (input, init) => {
      url = String(input);
      expect(init?.body).toBe(raw);
      return new Response("VALID\n", { status: 200 });
    });
    expect(result.status).toBe(200);
    expect(url).toBe("https://www.payfast.co.za/eng/query/validate");
  });

  it("keeps ITN responses free of CORS headers", () => {
    const route = readFileSync(path.resolve("src/app/api/payfast/itn/route.ts"), "utf8");
    expect(route).not.toMatch(/Access-Control-Allow-Origin/);
    expect(route).toMatch(/handlePayfastItn/);
    const captures = readFileSync(path.resolve("src/app/api/captures/route.ts"), "utf8");
    const yours = readFileSync(path.resolve("src/app/api/yours/route.ts"), "utf8");
    const story = readFileSync(path.resolve("src/components/YoursStory.tsx"), "utf8");
    const keep = readFileSync(path.resolve("src/lib/keep-card.ts"), "utf8");
    const joy = readFileSync(path.resolve("src/components/JoyStudio.tsx"), "utf8");
    expect(captures).toMatch(/getEntitlement/);
    expect(captures).toMatch(/if \(!replacing\)/);
    expect(captures).toMatch(/await consumeMoment\(email\)/);
    expect(captures).toMatch(/left == null/);
    expect(captures).toMatch(/restoreMoment/);
    expect(yours).not.toMatch(/consumeMoment/);
    expect(story).not.toMatch(/consumeMoment/);
    expect(keep).not.toMatch(/consumeMoment/);
    expect(joy).not.toMatch(/consumeMoment/);
    expect(captures).not.toMatch(/Today's photo is locked/);
  });
});

function hiddenFields(html: string): Record<string, string> {
  const fields: Record<string, string> = {};
  const pattern = /<input type="hidden" name="([^"]+)" value="([^"]*)" \/>/g;
  for (const match of html.matchAll(pattern)) {
    fields[match[1]] = match[2]
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">");
  }
  return fields;
}

function signedItn(overrides: Record<string, string> = {}): string {
  const email = overrides.email_address ?? "amy@example.com";
  const values = new Map<string, string>([
    ["m_payment_id", "pay_test"],
    ["pf_payment_id", "1089250"],
    ["payment_status", "COMPLETE"],
    ["item_name", ITEM_NAME],
    ["item_description", ITEM_DESCRIPTION],
    ["amount_gross", PACK_AMOUNT],
    ["amount_fee", "-10.35"],
    ["amount_net", "439.65"],
    ["custom_str1", emailVaultId(email)],
    ["name_first", ""],
    ["email_address", email],
    ["merchant_id", "10000100"],
  ]);
  for (const [key, value] of Object.entries(overrides)) values.set(key, value);
  if (overrides.email_address && !overrides.custom_str1) {
    values.set("custom_str1", emailVaultId(overrides.email_address));
  }
  const pairs = [...values.entries()];
  const signature = signPairs(pairs, process.env.PF_PASSPHRASE ?? "");
  const withSignature: Array<[string, string]> = [];
  pairs.forEach((pair, index) => {
    if (index === 2) withSignature.push(["signature", signature]);
    withSignature.push(pair);
  });
  return withSignature.map(([key, value]) => `${pfEncode(key)}=${pfEncode(value)}`).join("&");
}
