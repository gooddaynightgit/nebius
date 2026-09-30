/** @vitest-environment happy-dom */

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import SignInForm from "@/components/SignInForm";
import { REQUEST_SENT, REQUEST_UNAVAILABLE } from "@/lib/otp";

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
      "Your OTP is on its way! Kindly check your email (or spam folder, just in case) to complete your verification — something good is about to happen.",
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
});
