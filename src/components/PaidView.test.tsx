/** @vitest-environment happy-dom */

import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { act } from "react";
import { createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import PaidPage from "@/app/paid/page";
import { PaidConfirming, PaidSuccess } from "@/components/PaidView";
import { readGateEmail, readOtpSession } from "@/lib/session";
import { PAID_CONFIRMING_LABEL, PAID_SUCCESS_HEADING, PAID_UNLOCK_HREF, rememberPayfastOrder } from "@/lib/paid-return";

const refresh = vi.hoisted(() => vi.fn());

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) => createElement("a", { href, ...rest }, children),
}));

vi.mock("next/navigation", () => ({
  redirect: (href: string) => {
    throw Object.assign(new Error("NEXT_REDIRECT"), { href });
  },
  useRouter: () => ({ refresh }),
}));

vi.mock("@/lib/session", () => ({
  readOtpSession: vi.fn(async () => ({ email: "amy@example.com" })),
  readGateEmail: vi.fn(async () => "amy@example.com"),
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe("paid page", () => {
  let dir: string;
  let root: Root;
  let container: HTMLDivElement;

  beforeEach(() => {
    dir = mkdtempSync(path.join(os.tmpdir(), "gdn-paid-page-"));
    process.env.DATA_DIR = dir;
    delete process.env.BLOB_READ_WRITE_TOKEN;
    delete process.env.BLOB_STORE_ID;
    delete process.env.NEBIUS_S3_BUCKET;
    refresh.mockReset();
    vi.mocked(readOtpSession).mockResolvedValue({ email: "amy@example.com" });
    vi.mocked(readGateEmail).mockResolvedValue("amy@example.com");
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    rmSync(dir, { recursive: true, force: true });
    vi.useRealTimers();
  });

  it("renders the unlocked page when the stored payment is complete", async () => {
    const { completePayfastOrder } = await import("@/lib/paid-return");
    await rememberPayfastOrder("amy@example.com", "pay_done");
    await completePayfastOrder("amy@example.com", "pay_done", "1089250");
    const page = await PaidPage({ searchParams: Promise.resolve({ ref: "pay_done" }) });
    const html = renderToStaticMarkup(page);
    expect(html).toContain(PAID_SUCCESS_HEADING);
    expect(html).toContain('href="/app/joy"');
    expect(html).toContain("Weave your good moment");
    expect(html).not.toContain(PAID_CONFIRMING_LABEL);
    expect(renderToStaticMarkup(createElement(PaidSuccess))).toContain(PAID_SUCCESS_HEADING);
  });

  it("renders the confirming state while the ITN is still pending", async () => {
    await rememberPayfastOrder("amy@example.com", "pay_wait");
    const page = await PaidPage({ searchParams: Promise.resolve({ ref: "pay_wait" }) });
    const html = renderToStaticMarkup(page);
    expect(html).toContain(PAID_CONFIRMING_LABEL);
    expect(html).not.toContain(PAID_SUCCESS_HEADING);
  });

  it("redirects a cancelled order, a stranger, and a bare visit, and never shows success", async () => {
    const { cancelPayfastOrder } = await import("@/lib/paid-return");
    await rememberPayfastOrder("amy@example.com", "pay_stop");
    await cancelPayfastOrder("pay_stop");

    await expect(PaidPage({ searchParams: Promise.resolve({ ref: "pay_stop" }) })).rejects.toMatchObject({
      href: PAID_UNLOCK_HREF,
    });
    await expect(PaidPage({ searchParams: Promise.resolve({}) })).rejects.toMatchObject({
      href: PAID_UNLOCK_HREF,
    });
    vi.mocked(readOtpSession).mockResolvedValue(null);
    await expect(PaidPage({ searchParams: Promise.resolve({ ref: "pay_done" }) })).rejects.toMatchObject({
      href: PAID_UNLOCK_HREF,
    });
    const confirming = renderToStaticMarkup(createElement(PaidConfirming, { orderRef: "pay_stop" }));
    expect(confirming).not.toContain(PAID_SUCCESS_HEADING);
  });

  it("rechecks a pending return and leaves for unlock when it never confirms", async () => {
    const assign = vi.fn();
    vi.stubGlobal("location", { ...window.location, assign });
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ status: "pending" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    vi.useFakeTimers();

    await act(async () => {
      root.render(createElement(PaidConfirming, { orderRef: "pay_wait" }));
    });
    expect(container.textContent).toContain(PAID_CONFIRMING_LABEL);
    expect(container.textContent).not.toContain(PAID_SUCCESS_HEADING);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2_000);
    });
    expect(fetchMock).toHaveBeenCalledWith("/api/payfast/paid?ref=pay_wait", expect.objectContaining({ cache: "no-store" }));
    expect(container.textContent).not.toContain(PAID_SUCCESS_HEADING);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(28_000);
    });
    expect(assign).toHaveBeenCalledWith(PAID_UNLOCK_HREF);
    expect(container.textContent).not.toContain(PAID_SUCCESS_HEADING);
  });
});
