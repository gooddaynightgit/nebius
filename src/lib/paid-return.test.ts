import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryFansTable, useFansTable } from "./fans";
import {
  handlePayfastItn,
  itnSignaturePayload,
  ITEM_DESCRIPTION,
  ITEM_NAME,
  md5Hex,
  PACK_AMOUNT,
  pfEncode,
} from "./payfast";
import {
  PAID_SUCCESS_HEADING,
  PAID_UNLOCK_HREF,
  paidViewForBuyer,
  rememberPayfastOrder,
  resolvePaidVisit,
} from "./paid-return";
import { authReturnDestination } from "@/app/api/auth/return/route";

const EMAIL = "amy@example.com";

describe("paid return", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(path.join(os.tmpdir(), "gdn-paid-"));
    process.env.DATA_DIR = dir;
    process.env.PF_MERCHANT_ID = "10000100";
    process.env.PF_MERCHANT_KEY = "46f0cd694581a";
    process.env.PF_PASSPHRASE = "test-passphrase";
    delete process.env.BLOB_READ_WRITE_TOKEN;
    delete process.env.BLOB_STORE_ID;
    delete process.env.NEBIUS_S3_BUCKET;
    useFansTable(new MemoryFansTable());
  });

  afterEach(() => {
    useFansTable(null);
    rmSync(dir, { recursive: true, force: true });
  });

  it("shows success only after a verified COMPLETE ITN for that buyer and order", async () => {
    await rememberPayfastOrder(EMAIL, "pay_done");
    const pending = await resolvePaidVisit({ email: EMAIL, ref: "pay_done" });
    expect(pending.kind).toBe("confirming");

    const result = await handlePayfastItn(itn("COMPLETE", "pay_done", "1089250"), async () => {
      return new Response("VALID", { status: 200 });
    });
    expect(result).toEqual({ status: 200, body: "OK" });

    const outcome = await resolvePaidVisit({ email: EMAIL, ref: "pay_done" });
    expect(outcome).toEqual({ kind: "success" });
    expect(await paidViewForBuyer(EMAIL, "pay_done")).toBe("complete");
    expect(await paidViewForBuyer("other@example.com", "pay_done")).toBe("absent");
    expect(await resolvePaidVisit({ email: EMAIL, ref: "pay_done&status=COMPLETE" })).toEqual({
      kind: "redirect",
      href: PAID_UNLOCK_HREF,
    });
  });

  it("keeps a remembered order pending until the ITN arrives", async () => {
    await rememberPayfastOrder(EMAIL, "pay_wait");
    expect(await resolvePaidVisit({ email: EMAIL, ref: "pay_wait" })).toEqual({
      kind: "confirming",
      ref: "pay_wait",
    });
    expect(await paidViewForBuyer(EMAIL, "pay_wait")).toBe("pending");
  });

  it("redirects a cancelled payment and a visit with no payment", async () => {
    await rememberPayfastOrder(EMAIL, "pay_stop");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const result = await handlePayfastItn(itn("CANCELLED", "pay_stop", "1089259"), async () => {
        return new Response("VALID", { status: 200 });
      });
      expect(result.status).toBe(500);
    } finally {
      warn.mockRestore();
    }
    expect(await paidViewForBuyer(EMAIL, "pay_stop")).toBe("absent");
    expect(await resolvePaidVisit({ email: EMAIL, ref: "pay_stop" })).toEqual({
      kind: "redirect",
      href: PAID_UNLOCK_HREF,
    });
    expect(await resolvePaidVisit({ email: EMAIL, ref: null })).toEqual({
      kind: "redirect",
      href: PAID_UNLOCK_HREF,
    });
    expect(await resolvePaidVisit({ email: null, ref: "pay_done" })).toEqual({
      kind: "redirect",
      href: PAID_UNLOCK_HREF,
    });
    expect(await resolvePaidVisit({ email: EMAIL, ref: "pay_unknown" })).toEqual({
      kind: "redirect",
      href: PAID_UNLOCK_HREF,
    });
    expect(PAID_SUCCESS_HEADING).toBe("Your moments are unlocked");
  });

  it("sends the paid handoff back to /paid and older returns to the photo page", () => {
    expect(authReturnDestination("https://gooddaynight.com/api/auth/return?to=paid&ref=pay_abc&handoff=abc")).toBe(
      "https://gooddaynight.com/paid?ref=pay_abc",
    );
    expect(authReturnDestination("https://gooddaynight.com/api/auth/return?paid=1&ref=pay_old")).toBe(
      "https://gooddaynight.com/app?paid=1&ref=pay_old",
    );
  });
});

function itn(status: string, mPaymentId: string, pfPaymentId: string): string {
  const fields: Record<string, string> = {
    m_payment_id: mPaymentId,
    pf_payment_id: pfPaymentId,
    payment_status: status,
    item_name: ITEM_NAME,
    item_description: ITEM_DESCRIPTION,
    amount_gross: PACK_AMOUNT,
    amount_fee: "-1.15",
    amount_net: "128.85",
    custom_str1: EMAIL,
    custom_str2: "",
    custom_str3: "",
    custom_str4: "",
    custom_str5: "",
    custom_int1: "",
    custom_int2: "",
    custom_int3: "",
    custom_int4: "",
    custom_int5: "",
    name_first: "",
    name_last: "",
    email_address: "payer@payfast.example",
    merchant_id: "10000100",
  };
  const order = [
    "m_payment_id",
    "pf_payment_id",
    "payment_status",
    "item_name",
    "item_description",
    "amount_gross",
    "amount_fee",
    "amount_net",
    "custom_str1",
    "custom_str2",
    "custom_str3",
    "custom_str4",
    "custom_str5",
    "custom_int1",
    "custom_int2",
    "custom_int3",
    "custom_int4",
    "custom_int5",
    "name_first",
    "name_last",
    "email_address",
    "merchant_id",
  ];
  const pairs = order.map((key) => [key, fields[key] ?? ""] as [string, string]);
  const signature = md5Hex(itnSignaturePayload(pairs, process.env.PF_PASSPHRASE ?? ""));
  return [...pairs, ["signature", signature] as [string, string]]
    .map(([key, value]) => `${pfEncode(key)}=${pfEncode(value)}`)
    .join("&");
}
