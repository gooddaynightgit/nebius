/** @vitest-environment happy-dom */

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import SignInForm from "@/components/SignInForm";
import {
  REQUEST_SENT,
  REQUEST_UNAVAILABLE,
  REQUEST_WAIT,
  RESEND_COOLDOWN_SECONDS,
  RESEND_SENT,
  RESEND_WAIT,
  SPAM_HINT,
  VERIFY_FAIL,
} from "@/lib/otp-copy";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("sign-in code sent", () => {
  let root: Root;
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });

  async function fillAndSend() {
    await act(async () => {
      root.render(<SignInForm />);
    });
    const email = container.querySelector("#signin-email") as HTMLInputElement;
    const button = container.querySelector(".moments-code") as HTMLButtonElement;
    await act(async () => {
      const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
      setValue?.call(email, "ada@example.com");
      email.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await act(async () => {
      button.click();
    });
  }

  it("shows the glowing sent line only after a successful send", async () => {
    expect(REQUEST_SENT).toBe(
      "Your OTP is on its way! Kindly check your email (or spam folder, just in case) to complete your verification — something good is happening.",
    );
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ ok: true, message: REQUEST_SENT })),
    );
    await fillAndSend();
    const note = container.querySelector(".otp-sent");
    expect(note?.textContent).toBe(REQUEST_SENT);
    expect(container.querySelector(".moments-status")?.className).toContain("otp-sent");
  });

  it("shows a gentle line for an incorrect code and clears it when the code changes", async () => {
    expect(VERIFY_FAIL).toBe("Could you please be so kind to enter the correct OTP sent to your email");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ ok: false, message: VERIFY_FAIL }, 400)),
    );
    await act(async () => {
      root.render(<SignInForm />);
    });
    const email = container.querySelector("#signin-email") as HTMLInputElement;
    const code = container.querySelector("#signin-code") as HTMLInputElement;
    const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    await act(async () => {
      setValue?.call(email, "ada@example.com");
      email.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await act(async () => {
      setValue?.call(code, "000000");
      code.dispatchEvent(new Event("input", { bubbles: true }));
    });
    const note = container.querySelector(".otp-wrong");
    expect(note?.textContent).toBe(VERIFY_FAIL);
    expect(note?.className).not.toContain("otp-sent");
    expect(container.querySelector(".otp-sent")).toBeNull();
    expect(container.querySelector("#signin-code")?.className).toContain("whisper--alert");
    expect(container.querySelector(".verify-code")?.className).toContain("verify-code--alert");
    await act(async () => {
      setValue?.call(code, "00000");
      code.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(container.querySelector(".otp-wrong")).toBeNull();
    expect(container.textContent).not.toContain(VERIFY_FAIL);
    expect(container.querySelector("#signin-code")?.className).not.toContain("whisper--alert");
    expect(container.querySelector(".verify-code")?.className).not.toContain("verify-code--alert");
  });

  it("does not show the sent line when the email fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ error: REQUEST_UNAVAILABLE }, 503)),
    );
    await fillAndSend();
    expect(container.textContent).toContain(REQUEST_UNAVAILABLE);
    expect(container.textContent).not.toContain(REQUEST_SENT);
    expect(container.querySelector(".otp-sent")).toBeNull();
  });

  it("hides spam hint and resend until a code is sent", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({ error: REQUEST_UNAVAILABLE }, 503)));
    await fillAndSend();
    expect(container.textContent).not.toContain(SPAM_HINT);
    expect(container.querySelector(".otp-resend")).toBeNull();
  });

  it("shows spam hint, a counting-down resend, and resends to the same email", async () => {
    vi.useFakeTimers();
    try {
      const fetchMock = vi.fn(async () => jsonResponse({ ok: true, message: REQUEST_SENT }));
      vi.stubGlobal("fetch", fetchMock);
      await fillAndSend();
      expect(container.querySelector(".otp-spam-hint")?.textContent).toBe(SPAM_HINT);
      expect(SPAM_HINT.toLowerCase()).not.toContain("story");
      const resend = () => container.querySelector(".otp-resend") as HTMLButtonElement;
      expect(resend().disabled).toBe(true);
      expect(resend().textContent).toBe(`Resend code in ${RESEND_COOLDOWN_SECONDS}s`);
      await act(async () => {
        vi.advanceTimersByTime(1000);
      });
      expect(resend().textContent).toBe(`Resend code in ${RESEND_COOLDOWN_SECONDS - 1}s`);
      for (let i = 0; i < RESEND_COOLDOWN_SECONDS; i += 1) {
        await act(async () => {
          vi.advanceTimersByTime(1000);
        });
      }
      expect(resend().disabled).toBe(false);
      expect(resend().textContent).toBe("Resend code");
      await act(async () => {
        resend().click();
      });
      expect(fetchMock).toHaveBeenCalledTimes(2);
      const calls = fetchMock.mock.calls as unknown as [string, RequestInit][];
      expect(calls[1][0]).toBe("/api/auth/request");
      expect(JSON.parse(String(calls[1][1].body))).toEqual({ email: "ada@example.com" });
      expect(container.querySelector(".otp-sent")?.textContent).toBe(RESEND_SENT);
      expect(container.querySelector("[aria-live='polite']")?.textContent).toBe(RESEND_SENT);
      expect(resend().disabled).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it("shows a friendly line when a resend is rate limited", async () => {
    vi.useFakeTimers();
    try {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(jsonResponse({ ok: true, message: REQUEST_SENT }))
        .mockResolvedValueOnce(jsonResponse({ ok: true, message: REQUEST_WAIT }));
      vi.stubGlobal("fetch", fetchMock);
      await fillAndSend();
      for (let i = 0; i < RESEND_COOLDOWN_SECONDS; i += 1) {
        await act(async () => {
          vi.advanceTimersByTime(1000);
        });
      }
      await act(async () => {
        (container.querySelector(".otp-resend") as HTMLButtonElement).click();
      });
      expect(container.textContent).toContain(RESEND_WAIT);
      expect(container.querySelector(".otp-sent")).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it("lets the user switch to a different email", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({ ok: true, message: REQUEST_SENT })));
    await fillAndSend();
    const email = container.querySelector("#signin-email") as HTMLInputElement;
    expect(email.readOnly).toBe(true);
    await act(async () => {
      (container.querySelector(".otp-other-email") as HTMLButtonElement).click();
    });
    expect(email.readOnly).toBe(false);
    expect(email.value).toBe("");
    expect(container.querySelector(".moments-code")).not.toBeNull();
    expect(container.querySelector(".otp-resend")).toBeNull();
  });
});
