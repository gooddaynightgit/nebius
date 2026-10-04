/** @vitest-environment happy-dom */

import { createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GoogleAdsPurchase } from "@/components/GoogleAdsPurchase";
import { adsPurchaseStorageKey } from "@/lib/google-ads";

const purchase = { transactionId: "1089250", value: 130, currency: "ZAR" };

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe("Google Ads purchase conversion", () => {
  let root: Root;
  let container: HTMLDivElement;
  const gtag = vi.fn();

  beforeEach(() => {
    process.env.NEXT_PUBLIC_GOOGLE_ADS_ID = "AW-123456789";
    process.env.NEXT_PUBLIC_GOOGLE_ADS_PURCHASE_LABEL = "purchaseLabel1";
    window.localStorage.clear();
    window.sessionStorage.clear();
    window.gtag = gtag;
    gtag.mockClear();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    delete window.gtag;
    delete process.env.NEXT_PUBLIC_GOOGLE_ADS_ID;
    delete process.env.NEXT_PUBLIC_GOOGLE_ADS_PURCHASE_LABEL;
    vi.useRealTimers();
  });

  async function renderPurchase() {
    await act(async () => {
      root.render(createElement(GoogleAdsPurchase, { purchase }));
    });
  }

  it("fires one conversion with the verified amount, currency, and Payfast id", async () => {
    await renderPurchase();
    expect(gtag).toHaveBeenCalledTimes(1);
    expect(gtag).toHaveBeenCalledWith("event", "conversion", {
      send_to: "AW-123456789/purchaseLabel1",
      value: 130,
      currency: "ZAR",
      transaction_id: "1089250",
    });
    expect(window.localStorage.getItem(adsPurchaseStorageKey("1089250"))).toBe("1");
    expect(window.sessionStorage.getItem(adsPurchaseStorageKey("1089250"))).toBe("1");
  });

  it("does not fire again for the same transaction id", async () => {
    await renderPurchase();
    await act(async () => {
      root.unmount();
    });
    root = createRoot(container);
    await renderPurchase();
    expect(gtag).toHaveBeenCalledTimes(1);
  });

  it("does not fire when this purchase was already recorded", async () => {
    window.localStorage.setItem(adsPurchaseStorageKey("1089250"), "1");
    await renderPurchase();
    expect(gtag).not.toHaveBeenCalled();
  });

  it("waits until gtag exists, then fires once", async () => {
    delete window.gtag;
    vi.useFakeTimers();
    await renderPurchase();
    expect(gtag).not.toHaveBeenCalled();
    window.gtag = gtag;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(250);
    });
    expect(gtag).toHaveBeenCalledTimes(1);
  });

  it("does not fire when either Ads env var is missing", async () => {
    delete process.env.NEXT_PUBLIC_GOOGLE_ADS_ID;
    await renderPurchase();
    expect(gtag).not.toHaveBeenCalled();

    process.env.NEXT_PUBLIC_GOOGLE_ADS_ID = "AW-123456789";
    delete process.env.NEXT_PUBLIC_GOOGLE_ADS_PURCHASE_LABEL;
    await act(async () => {
      root.render(createElement(GoogleAdsPurchase, { purchase }));
    });
    expect(gtag).not.toHaveBeenCalled();
  });

  it("does not fire for a zero amount", async () => {
    await act(async () => {
      root.render(createElement(GoogleAdsPurchase, { purchase: { ...purchase, value: 0 } }));
    });
    expect(gtag).not.toHaveBeenCalled();
    expect(window.localStorage.getItem(adsPurchaseStorageKey("1089250"))).toBeNull();
  });
});
