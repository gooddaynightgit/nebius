import { readFileSync } from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { accountMenuItems } from "./account-menu";

vi.mock("@/lib/session", () => ({
  clearOtpSession: vi.fn(),
  readOtpSession: vi.fn(),
  readGateEmail: vi.fn(),
}));

import { POST as logout } from "@/app/api/auth/logout/route";
import { GET as session } from "@/app/api/auth/session/route";
import { readGateEmail, readOtpSession, clearOtpSession } from "@/lib/session";

function read(rel: string): string {
  return readFileSync(path.resolve(rel), "utf8");
}

describe("account menu items", () => {
  it("offers sign in and about when signed out", () => {
    expect(accountMenuItems({ signedIn: false })).toEqual([
      { kind: "link", label: "Sign in", href: "/signin" },
      { kind: "link", label: "About the maker", href: "/about" },
    ]);
  });

  it("shows the email, moments, log out, and about when signed in", () => {
    expect(accountMenuItems({ signedIn: true, email: "amy@email.com" })).toEqual([
      { kind: "email", email: "amy@email.com" },
      { kind: "link", label: "My moments", href: "/moments" },
      { kind: "logout", label: "Log out" },
      { kind: "link", label: "About the maker", href: "/about" },
    ]);
    expect(accountMenuItems({ signedIn: true, email: "amy@email.com" }).some((item) => item.kind === "link" && item.label === "Sign in")).toBe(false);
  });
});

describe("logout route", () => {
  beforeEach(() => {
    vi.mocked(clearOtpSession).mockReset();
    vi.mocked(clearOtpSession).mockResolvedValue();
  });

  it("clears the sign-in cookies and sends the visitor home", async () => {
    const res = await logout();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, next: "/" });
    expect(clearOtpSession).toHaveBeenCalledOnce();
  });

  it("ends the otp cookies without deleting saved moments", () => {
    const route = read("src/app/api/auth/logout/route.ts");
    const session = read("src/lib/session.ts");
    const menu = read("src/components/AccountMenu.tsx");
    expect(route).toMatch(/clearOtpSession/);
    expect(route).not.toMatch(/gdn_sid|deleteVault|clearDayLock|captures/);
    expect(session).toMatch(/export async function clearOtpSession/);
    expect(session).toMatch(/jar\.set\(OTP_COOKIE, "", expired\)/);
    expect(session).toMatch(/jar\.set\(EMAIL_COOKIE, "", expired\)/);
    const clear = session.slice(session.indexOf("export async function clearOtpSession"));
    expect(clear).not.toMatch(/SESSION_COOKIE|gdn_sid/);
    expect(menu).toMatch(/aria-label="Menu"/);
    expect(menu).toMatch(/aria-expanded=\{open\}/);
    expect(menu).toMatch(/\/api\/auth\/logout/);
    expect(menu).toMatch(/window\.location\.assign\("\/"\)/);
  });
});

describe("auth session route", () => {
  beforeEach(() => {
    vi.mocked(readOtpSession).mockReset();
    vi.mocked(readGateEmail).mockReset();
  });

  it("reports the matching email when both cookies agree", async () => {
    vi.mocked(readOtpSession).mockResolvedValue({ email: "amy@email.com" });
    vi.mocked(readGateEmail).mockResolvedValue("amy@email.com");
    const res = await session();
    expect(await res.json()).toEqual({ signedIn: true, email: "amy@email.com" });
  });

  it("stays signed out when the cookies do not match", async () => {
    vi.mocked(readOtpSession).mockResolvedValue({ email: "amy@email.com" });
    vi.mocked(readGateEmail).mockResolvedValue("other@email.com");
    const res = await session();
    expect(await res.json()).toEqual({ signedIn: false, email: null });
  });
});
