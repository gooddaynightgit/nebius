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
import { authReturnDestination, sealBuyerHandoff } from "./buyer-handoff";
import { GET as paidStatus } from "@/app/api/payfast/paid/route";
import {
  PAID_SUCCESS_HEADING,
  paidPollForHandoff,
  paidViewForHandoff,
  rememberPayfastOrder,
  resolvePaidVisit,
} from "./paid-return";

const EMAIL = "amy@example.com";
const SECRET = "paid-test-secret";
const NOW = 1_700_000_000;

describe("paid return", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(path.join(os.tmpdir(), "gdn-paid-"));
    process.env.DATA_DIR = dir;
    process.env.PF_MERCHANT_ID = "10000100";
    process.env.PF_MERCHANT_KEY = "46f0cd694581a";
    process.env.PF_PASSPHRASE = "test-passphrase";
    process.env.OTP_SESSION_SECRET = SECRET;
    delete process.env.BLOB_READ_WRITE_TOKEN;
    delete process.env.BLOB_STORE_ID;
    delete process.env.NEBIUS_S3_BUCKET;
    useFansTable(new MemoryFansTable());
  });

  afterEach(() => {
    useFansTable(null);
    rmSync(dir, { recursive: true, force: true });
  });

  it("shows success only after a verified COMPLETE ITN for the signed handoff", async () => {
    const token = sealBuyerHandoff(EMAIL, NOW, SECRET);
    await rememberPayfastOrder(EMAIL, "pay_done");
    expect(await resolvePaidVisit({ ref: "pay_done", handoff: token, nowSec: NOW })).toEqual({
      kind: "confirming",
      ref: "pay_done",
      handoff: token,
    });

    const result = await handlePayfastItn(itn("COMPLETE", "pay_done", "1089250"), async () => {
      return new Response("VALID", { status: 200 });
    });
    expect(result).toEqual({ status: 200, body: "OK" });

    expect(await resolvePaidVisit({ ref: "pay_done", handoff: token, nowSec: NOW })).toEqual({
      kind: "success",
      purchase: { transactionId: "1089250", value: 130, currency: "ZAR" },
    });
    expect(await paidPollForHandoff("pay_done", token, NOW)).toEqual({
      status: "complete",
      purchase: { transactionId: "1089250", value: 130, currency: "ZAR" },
    });
    expect(await paidPollForHandoff("pay_done", sealBuyerHandoff("other@example.com", NOW, SECRET), NOW)).toEqual({
      status: "absent",
    });
    const realNow = Date.now;
    Date.now = () => NOW * 1000;
    try {
      const allowed = await paidStatus(new Request(`https://gooddaynight.com/api/payfast/paid?ref=pay_done&handoff=${token}`));
      expect(allowed.status).toBe(200);
      expect(await allowed.json()).toEqual({
        status: "complete",
        purchase: { transactionId: "1089250", value: 130, currency: "ZAR" },
      });
      const forged = await paidStatus(
        new Request(`https://gooddaynight.com/api/payfast/paid?ref=pay_done&handoff=${token}x`),
      );
      expect(forged.status).toBe(404);
      expect(await forged.json()).toEqual({ status: "absent" });
    } finally {
      Date.now = realNow;
    }
    expect(await paidViewForHandoff("pay_done", token, NOW)).toBe("complete");
    const { completePayfastOrder } = await import("./paid-return");
    await rememberPayfastOrder(EMAIL, "pay_old");
    await completePayfastOrder(EMAIL, "pay_old", "1089251");
    expect(await resolvePaidVisit({ ref: "pay_old", handoff: token, nowSec: NOW })).toEqual({
      kind: "success",
      purchase: null,
    });
    expect(await paidViewForHandoff("pay_done", sealBuyerHandoff("other@example.com", NOW, SECRET), NOW)).toBe("absent");
    expect(await resolvePaidVisit({ ref: "pay_done", handoff: null, nowSec: NOW })).toEqual({ kind: "missing" });
    expect(PAID_SUCCESS_HEADING).toBe("You're in. 25 moments are yours.");
  });

  it("keeps a signed order pending until the ITN arrives", async () => {
    const token = sealBuyerHandoff(EMAIL, NOW, SECRET);
    await rememberPayfastOrder(EMAIL, "pay_wait");
    expect(await resolvePaidVisit({ ref: "pay_wait", handoff: token, nowSec: NOW })).toEqual({
      kind: "confirming",
      ref: "pay_wait",
      handoff: token,
    });
    expect(await paidViewForHandoff("pay_wait", token, NOW)).toBe("pending");
    expect(await paidPollForHandoff("pay_wait", token, NOW)).toEqual({ status: "pending" });
  });

  it("hides a cancelled payment, a forged ref, and a visit with no token", async () => {
    const token = sealBuyerHandoff(EMAIL, NOW, SECRET);
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
    expect(await resolvePaidVisit({ ref: "pay_stop", handoff: token, nowSec: NOW })).toEqual({ kind: "missing" });
    expect(await resolvePaidVisit({ ref: null, handoff: null, nowSec: NOW })).toEqual({ kind: "missing" });
    expect(await resolvePaidVisit({ ref: "pay_forged", handoff: token, nowSec: NOW })).toEqual({ kind: "missing" });
    expect(await resolvePaidVisit({ ref: "pay_stop", handoff: `${token}x`, nowSec: NOW })).toEqual({ kind: "missing" });
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
