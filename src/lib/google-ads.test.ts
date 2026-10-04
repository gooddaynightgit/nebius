import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  GA4_MEASUREMENT_ID,
  GOOGLE_ADS_ID_PLACEHOLDER,
  GOOGLE_ADS_PURCHASE_LABEL_PLACEHOLDER,
  adsPurchaseStorageKey,
  googleAdsConfig,
  googleAdsPurchaseSendTo,
  googleTagSnippet,
  purchaseFromClient,
  purchaseFromStored,
} from "./google-ads";

const ADS_ID = "AW-123456789";
const LABEL = "purchaseLabel1";

function read(rel: string) {
  return readFileSync(path.resolve(rel), "utf8");
}

describe("google ads stays off until both ids are valid", () => {
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_GOOGLE_ADS_ID;
    delete process.env.NEXT_PUBLIC_GOOGLE_ADS_PURCHASE_LABEL;
  });

  it("loads only GA4 when neither env var is set", () => {
    delete process.env.NEXT_PUBLIC_GOOGLE_ADS_ID;
    delete process.env.NEXT_PUBLIC_GOOGLE_ADS_PURCHASE_LABEL;
    expect(googleAdsConfig()).toBeNull();
    expect(googleAdsPurchaseSendTo()).toBeNull();
    const tag = googleTagSnippet();
    expect(tag.src).toBe(`https://www.googletagmanager.com/gtag/js?id=${GA4_MEASUREMENT_ID}`);
    expect(tag.html).toContain(`gtag('config', '${GA4_MEASUREMENT_ID}');`);
    expect(tag.html).not.toContain("AW-");
    expect(tag.src).not.toContain("AW-");
  });

  it("stays off when only the Ads id is set", () => {
    process.env.NEXT_PUBLIC_GOOGLE_ADS_ID = ADS_ID;
    delete process.env.NEXT_PUBLIC_GOOGLE_ADS_PURCHASE_LABEL;
    expect(googleAdsConfig()).toBeNull();
    expect(googleAdsPurchaseSendTo()).toBeNull();
    const tag = googleTagSnippet();
    expect(tag.html).toContain(`gtag('config', '${GA4_MEASUREMENT_ID}');`);
    expect(tag.html).not.toContain("AW-");
    expect(tag.src).not.toContain(ADS_ID);
  });

  it("stays off when only the purchase label is set", () => {
    delete process.env.NEXT_PUBLIC_GOOGLE_ADS_ID;
    process.env.NEXT_PUBLIC_GOOGLE_ADS_PURCHASE_LABEL = LABEL;
    expect(googleAdsConfig()).toBeNull();
    expect(googleAdsPurchaseSendTo()).toBeNull();
    const tag = googleTagSnippet();
    expect(tag.html).not.toContain("AW-");
    expect(tag.html).toContain(GA4_MEASUREMENT_ID);
  });

  it("configures Ads only when both values are valid", () => {
    process.env.NEXT_PUBLIC_GOOGLE_ADS_ID = `  ${ADS_ID}  `;
    process.env.NEXT_PUBLIC_GOOGLE_ADS_PURCHASE_LABEL = `  ${LABEL}  `;
    expect(googleAdsConfig()).toEqual({
      id: ADS_ID,
      sendTo: `${ADS_ID}/${LABEL}`,
    });
    expect(googleAdsPurchaseSendTo()).toBe(`${ADS_ID}/${LABEL}`);
    const tag = googleTagSnippet();
    expect(tag.src).toBe(`https://www.googletagmanager.com/gtag/js?id=${GA4_MEASUREMENT_ID}`);
    expect(tag.html).toContain(`gtag('config', '${GA4_MEASUREMENT_ID}');`);
    expect(tag.html).toContain(`gtag('config', '${ADS_ID}');`);
    expect(tag.html).not.toContain(GOOGLE_ADS_ID_PLACEHOLDER);
    expect(tag.html).not.toContain("conversion");
  });

  it("never sends the placeholder id or label", () => {
    expect(googleAdsConfig(GOOGLE_ADS_ID_PLACEHOLDER, GOOGLE_ADS_PURCHASE_LABEL_PLACEHOLDER)).toBeNull();
    expect(googleAdsConfig(GOOGLE_ADS_ID_PLACEHOLDER, LABEL)).toBeNull();
    expect(googleAdsConfig(ADS_ID, GOOGLE_ADS_PURCHASE_LABEL_PLACEHOLDER)).toBeNull();
    expect(googleAdsPurchaseSendTo(GOOGLE_ADS_ID_PLACEHOLDER, LABEL)).toBeNull();
    const tag = googleTagSnippet(GOOGLE_ADS_ID_PLACEHOLDER, GOOGLE_ADS_PURCHASE_LABEL_PLACEHOLDER);
    expect(tag.html).not.toContain("AW-");
    expect(tag.src).not.toContain("AW-");
    expect(googleAdsConfig(ADS_ID, "label';alert(1)")).toBeNull();
    expect(googleAdsConfig("AW-1';alert(1)//", LABEL)).toBeNull();
  });

  it("reads a verified major-unit amount and ignores a missing one", () => {
    expect(purchaseFromStored({ pfPaymentId: "1089250", amount: "130.00", currency: "zar" })).toEqual({
      transactionId: "1089250",
      value: 130,
      currency: "ZAR",
    });
    expect(purchaseFromStored({ pfPaymentId: "1089250", amount: "130.50", currency: "ZAR" })?.value).toBe(130.5);
    expect(purchaseFromStored({ pfPaymentId: "1089250" })).toBeNull();
    expect(purchaseFromStored({ pfPaymentId: "1089250", amount: "130.001", currency: "ZAR" })).toBeNull();
    expect(purchaseFromClient({ transactionId: "1089250", value: 130, currency: "ZAR" })).toEqual({
      transactionId: "1089250",
      value: 130,
      currency: "ZAR",
    });
    expect(purchaseFromClient({ transactionId: "1089250", value: 130, currency: "zar" })).toEqual({
      transactionId: "1089250",
      value: 130,
      currency: "ZAR",
    });
    expect(purchaseFromClient(null)).toBeNull();
    expect(adsPurchaseStorageKey("1089250")).toBe("gdn_gads_purchase:1089250");
  });

  it("installs GA4 from the root layout and keeps the conversion off the layout", () => {
    const layout = read("src/app/layout.tsx");
    expect(layout).toContain('from "next/script"');
    expect(layout).toContain('strategy="afterInteractive"');
    expect(layout).toContain("googleTagSnippet()");
    expect(layout).not.toContain(GOOGLE_ADS_ID_PLACEHOLDER);
    expect(layout).not.toContain("conversion");
    expect(read("src/lib/google-ads.ts")).toContain(GA4_MEASUREMENT_ID);
    const paid = read("src/components/PaidView.tsx");
    expect(paid).toContain("googleAdsConfig() != null");
    expect(paid).toContain("purchaseFromClient");
    expect(read("src/app/paid/page.tsx")).toContain("purchase={outcome.purchase}");
    expect(read("src/app/api/payfast/paid/route.ts")).toContain("purchase: result.purchase");
  });
});
