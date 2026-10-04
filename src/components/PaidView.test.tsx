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
import AccountMenu from "@/components/AccountMenu";
import FeedbackRibbon from "@/components/FeedbackRibbon";
import { PaidConfirming, PaidSuccess } from "@/components/PaidView";
import { sealBuyerHandoff } from "@/lib/buyer-handoff";
import {
  PAID_CONFIRMING_LABEL,
  PAID_SETTLING_HEADING,
  PAID_SUCCESS_HEADING,
  PAID_SUCCESS_LINE,
  rememberPayfastOrder,
} from "@/lib/paid-return";

const refresh = vi.hoisted(() => vi.fn());
const notFound = vi.hoisted(() =>
  vi.fn(() => {
    throw Object.assign(new Error("NEXT_NOT_FOUND"), { digest: "NEXT_HTTP_ERROR_FALLBACK;404" });
  }),
);
const pathname = vi.hoisted(() => vi.fn(() => "/paid"));

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
  notFound,
  useRouter: () => ({ refresh }),
  usePathname: () => pathname(),
}));

const SECRET = "paid-page-secret";
const NOW = 1_700_000_000;
const EMAIL = "amy@example.com";

function token(email = EMAIL): string {
  return sealBuyerHandoff(email, NOW, SECRET);
}

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe("paid page", () => {
  let dir: string;
  let root: Root;
  let container: HTMLDivElement;
  const realNow = Date.now;

  beforeEach(() => {
    dir = mkdtempSync(path.join(os.tmpdir(), "gdn-paid-page-"));
    process.env.DATA_DIR = dir;
    process.env.OTP_SESSION_SECRET = SECRET;
    delete process.env.BLOB_READ_WRITE_TOKEN;
    delete process.env.BLOB_STORE_ID;
    delete process.env.NEBIUS_S3_BUCKET;
    Date.now = () => NOW * 1000;
    refresh.mockReset();
    notFound.mockClear();
    pathname.mockReturnValue("/paid");
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    Date.now = realNow;
    act(() => {
      root.unmount();
    });
    container.remove();
    rmSync(dir, { recursive: true, force: true });
    window.localStorage.clear();
    window.sessionStorage.clear();
    delete window.gtag;
    delete process.env.NEXT_PUBLIC_GOOGLE_ADS_ID;
    delete process.env.NEXT_PUBLIC_GOOGLE_ADS_PURCHASE_LABEL;
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("returns the success page for a signed-out buyer when the order is complete", async () => {
    const { completePayfastOrder } = await import("@/lib/paid-return");
    await rememberPayfastOrder(EMAIL, "pay_done");
    await completePayfastOrder(EMAIL, "pay_done", "1089250", { amount: "130.00", currency: "ZAR" });
    const page = await PaidPage({
      searchParams: Promise.resolve({ ref: "pay_done", handoff: token() }),
    });
    const html = renderToStaticMarkup(page);
    expect(notFound).not.toHaveBeenCalled();
    expect(html).toContain("25 moments are yours.");
    expect(html).toContain(PAID_SUCCESS_LINE);
    expect(html).toContain('href="/"');
    expect(html).toContain("Open GoodDayNight");
    expect(html).not.toContain("Weave your good moment");
    expect(html).not.toContain("/moments");
    expect(html).not.toContain("/signin");
    expect(html).not.toContain(PAID_CONFIRMING_LABEL);
    expect(renderToStaticMarkup(createElement(PaidSuccess))).toContain("25 moments are yours.");
    expect(PAID_SUCCESS_HEADING).toBe("You're in. 25 moments are yours.");
  });

  it("shows the confirming state for a valid signed order that is still pending", async () => {
    await rememberPayfastOrder(EMAIL, "pay_wait");
    const page = await PaidPage({
      searchParams: Promise.resolve({ ref: "pay_wait", handoff: token() }),
    });
    const html = renderToStaticMarkup(page);
    expect(notFound).not.toHaveBeenCalled();
    expect(html).toContain(PAID_CONFIRMING_LABEL);
    expect(html).not.toContain("25 moments are yours.");
    expect(html).not.toContain("Weave your good moment");
  });

  it("returns 404 for no params, a forged ref, and a cancelled payment", async () => {
    const { cancelPayfastOrder } = await import("@/lib/paid-return");
    await rememberPayfastOrder(EMAIL, "pay_stop");
    await cancelPayfastOrder("pay_stop");

    await expect(PaidPage({ searchParams: Promise.resolve({}) })).rejects.toMatchObject({
      digest: "NEXT_HTTP_ERROR_FALLBACK;404",
    });
    await expect(
      PaidPage({ searchParams: Promise.resolve({ ref: "pay_forged", handoff: token() }) }),
    ).rejects.toMatchObject({ digest: "NEXT_HTTP_ERROR_FALLBACK;404" });
    await expect(
      PaidPage({ searchParams: Promise.resolve({ ref: "pay_stop", handoff: `${token()}x` }) }),
    ).rejects.toMatchObject({ digest: "NEXT_HTTP_ERROR_FALLBACK;404" });
    await expect(
      PaidPage({ searchParams: Promise.resolve({ ref: "pay_stop", handoff: token() }) }),
    ).rejects.toMatchObject({ digest: "NEXT_HTTP_ERROR_FALLBACK;404" });
    expect(notFound).toHaveBeenCalled();
  });

  it("keeps confirming, then stays on a calm message with no funnel", async () => {
    const assign = vi.fn();
    vi.stubGlobal("location", { ...window.location, assign });
    const handoff = token();
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ status: "pending" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    vi.useFakeTimers();

    await act(async () => {
      root.render(createElement(PaidConfirming, { orderRef: "pay_wait", handoff }));
    });
    expect(container.textContent).toContain(PAID_CONFIRMING_LABEL);
    expect(container.textContent).not.toContain("25 moments are yours.");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2_000);
    });
    const called = String(fetchMock.mock.calls[0]?.[0]);
    expect(called).toContain("/api/payfast/paid?");
    expect(called).toContain("ref=pay_wait");
    expect(called).toContain("handoff=");
    expect(container.textContent).not.toContain("25 moments are yours.");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(28_000);
    });
    expect(assign).not.toHaveBeenCalled();
    expect(container.textContent).toContain(PAID_SETTLING_HEADING);
    expect(container.textContent).not.toContain("25 moments are yours.");
    expect(container.textContent).not.toContain("Weave your good moment");
    expect(container.innerHTML).not.toContain("/moments");
  });

  it("does not mount or fire a conversion unless both Ads env vars are set", async () => {
    const gtag = vi.fn();
    window.gtag = gtag;
    const purchase = { transactionId: "1089250", value: 130, currency: "ZAR" };
    delete process.env.NEXT_PUBLIC_GOOGLE_ADS_ID;
    delete process.env.NEXT_PUBLIC_GOOGLE_ADS_PURCHASE_LABEL;
    await act(async () => {
      root.render(createElement(PaidSuccess, { purchase }));
    });
    expect(gtag).not.toHaveBeenCalled();

    process.env.NEXT_PUBLIC_GOOGLE_ADS_ID = "AW-123456789";
    await act(async () => {
      root.render(createElement(PaidSuccess, { purchase }));
    });
    expect(gtag).not.toHaveBeenCalled();

    delete process.env.NEXT_PUBLIC_GOOGLE_ADS_ID;
    process.env.NEXT_PUBLIC_GOOGLE_ADS_PURCHASE_LABEL = "purchaseLabel1";
    await act(async () => {
      root.render(createElement(PaidSuccess, { purchase }));
    });
    expect(gtag).not.toHaveBeenCalled();

    process.env.NEXT_PUBLIC_GOOGLE_ADS_ID = "AW-123456789";
    await act(async () => {
      root.render(createElement(PaidSuccess, { purchase }));
    });
    expect(gtag).toHaveBeenCalledTimes(1);
    expect(gtag).toHaveBeenCalledWith("event", "conversion", {
      send_to: "AW-123456789/purchaseLabel1",
      value: 130,
      currency: "ZAR",
      transaction_id: "1089250",
    });
  });

  it("fires one conversion when a pending payment is confirmed", async () => {
    process.env.NEXT_PUBLIC_GOOGLE_ADS_ID = "AW-123456789";
    process.env.NEXT_PUBLIC_GOOGLE_ADS_PURCHASE_LABEL = "purchaseLabel1";
    const gtag = vi.fn();
    window.gtag = gtag;
    let calls = 0;
    const fetchMock = vi.fn(async () => {
      calls += 1;
      if (calls < 2) {
        return new Response(JSON.stringify({ status: "pending" }), { status: 200 });
      }
      return new Response(
        JSON.stringify({
          status: "complete",
          purchase: { transactionId: "1089250", value: 130, currency: "ZAR" },
        }),
        { status: 200 },
      );
    });
    vi.stubGlobal("fetch", fetchMock);
    vi.useFakeTimers();

    await act(async () => {
      root.render(createElement(PaidConfirming, { orderRef: "pay_wait", handoff: token() }));
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2_000);
    });
    expect(gtag).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2_000);
    });
    expect(gtag).toHaveBeenCalledTimes(1);
    expect(gtag).toHaveBeenCalledWith("event", "conversion", {
      send_to: "AW-123456789/purchaseLabel1",
      value: 130,
      currency: "ZAR",
      transaction_id: "1089250",
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });
    expect(gtag).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not fire a conversion when confirmation never arrives", async () => {
    process.env.NEXT_PUBLIC_GOOGLE_ADS_ID = "AW-123456789";
    process.env.NEXT_PUBLIC_GOOGLE_ADS_PURCHASE_LABEL = "purchaseLabel1";
    const gtag = vi.fn();
    window.gtag = gtag;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ status: "pending" }), { status: 200 })),
    );
    vi.useFakeTimers();

    await act(async () => {
      root.render(createElement(PaidConfirming, { orderRef: "pay_wait", handoff: token() }));
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });
    expect(container.textContent).toContain(PAID_SETTLING_HEADING);
    expect(gtag).not.toHaveBeenCalled();
  });

  it("leaves the menu and the testimonial strip off this page", async () => {
    await act(async () => {
      root.render(
        createElement(
          "div",
          null,
          createElement(AccountMenu),
          createElement(FeedbackRibbon),
        ),
      );
    });
    expect(container.querySelector("[aria-label='Menu']")).toBeNull();
    expect(container.querySelector("[aria-label='Feedback']")).toBeNull();
    expect(container.textContent).not.toContain("Sign in");
  });
});
