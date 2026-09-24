import { describe, expect, it } from "vitest";
import {
  CODE_TTL_SECONDS,
  ISSUE_WINDOW_SECONDS,
  MAX_ISSUES,
  MAX_VERIFY_ATTEMPTS,
  MemoryOtpTable,
  hashCode,
  issueOtp,
  safeEqualHex,
  verifyOtp,
} from "./otp";

describe("otp codes", () => {
  it("stores a sha-256 hash and not the code", async () => {
    const table = new MemoryOtpTable();
    const issued = await issueOtp("Amy@Email.com", table, { now: 1_000, code: "042013" });
    expect(issued).toEqual({ ok: true, code: "042013" });
    const row = await table.get("amy@email.com");
    expect(row?.codeHash).toBe(hashCode("amy@email.com", "042013"));
    expect(row?.codeHash).toMatch(/^[a-f0-9]{64}$/);
    expect(row?.codeHash).not.toContain("042013");
    expect(row?.expiresAt).toBe(1_000 + CODE_TTL_SECONDS);
    expect(row?.attempts).toBe(0);
    expect(row?.used).toBe(false);
    expect(hashCode("Amy@Email.com", "042013")).toBe(hashCode("amy@email.com", "042013"));
    expect(hashCode("a@b.co", "042013")).not.toBe(hashCode("c@d.co", "042013"));
  });

  it("compares hashes in constant time without throwing on length mismatch", () => {
    const hash = hashCode("amy@email.com", "042013");
    expect(safeEqualHex(hash, hash)).toBe(true);
    expect(safeEqualHex(hash, hash.replace("a", "b"))).toBe(false);
    expect(safeEqualHex(hash, "abc")).toBe(false);
  });

  it("allows three codes in the issue window and blocks the fourth", async () => {
    const table = new MemoryOtpTable();
    const start = 10_000;
    for (let i = 0; i < MAX_ISSUES; i += 1) {
      const issued = await issueOtp("amy@email.com", table, { now: start + i, code: `00000${i}` });
      expect(issued.ok).toBe(true);
    }
    const blocked = await issueOtp("amy@email.com", table, {
      now: start + ISSUE_WINDOW_SECONDS - 1,
      code: "999999",
    });
    expect(blocked).toEqual({ ok: false, reason: "rate" });
    const later = await issueOtp("amy@email.com", table, {
      now: start + ISSUE_WINDOW_SECONDS,
      code: "111111",
    });
    expect(later.ok).toBe(true);
  });

  it("burns an attempt, accepts the code once, and rejects a reused code", async () => {
    const table = new MemoryOtpTable();
    await issueOtp("amy@email.com", table, { now: 2_000, code: "123456" });
    expect(await verifyOtp("amy@email.com", "000000", table, 2_100)).toBe(false);
    expect((await table.get("amy@email.com"))?.attempts).toBe(1);
    expect((await table.get("amy@email.com"))?.used).toBe(false);
    expect(await verifyOtp("Amy@Email.com", "123456", table, 2_200)).toBe(true);
    expect((await table.get("amy@email.com"))?.used).toBe(true);
    expect(await verifyOtp("amy@email.com", "123456", table, 2_300)).toBe(false);
  });

  it("stops after five wrong attempts and after the code expires", async () => {
    const table = new MemoryOtpTable();
    await issueOtp("amy@email.com", table, { now: 3_000, code: "654321" });
    for (let i = 0; i < MAX_VERIFY_ATTEMPTS; i += 1) {
      expect(await verifyOtp("amy@email.com", "000000", table, 3_100 + i)).toBe(false);
    }
    expect(await verifyOtp("amy@email.com", "654321", table, 3_200)).toBe(false);

    const fresh = new MemoryOtpTable();
    await issueOtp("amy@email.com", fresh, { now: 4_000, code: "654321" });
    expect(await verifyOtp("amy@email.com", "654321", fresh, 4_000 + CODE_TTL_SECONDS)).toBe(false);
    expect(await verifyOtp("amy@email.com", "654321", fresh, 4_000 + CODE_TTL_SECONDS - 1)).toBe(true);
  });

  it("does not confirm a missing email differently from a wrong code", async () => {
    const table = new MemoryOtpTable();
    await issueOtp("amy@email.com", table, { now: 5_000, code: "123456" });
    const missing = await verifyOtp("other@email.com", "123456", table, 5_100);
    const wrong = await verifyOtp("amy@email.com", "000000", table, 5_100);
    expect(missing).toBe(false);
    expect(wrong).toBe(false);
  });
});
