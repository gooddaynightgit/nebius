import { createElement } from "react";
import { readFileSync } from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import MomentsPrice from "@/components/MomentsPrice";
import { PACK_AMOUNT } from "@/lib/payfast";

describe("unlock card price", () => {
  it("shows one dollar card, in the same markup as the old rand card", () => {
    const html = renderToStaticMarkup(createElement(MomentsPrice));
    expect(html).toBe(
      '<p class="moments-price-hero"><span class="moments-price-hero__amount">$7.99</span><span class="moments-price-hero__unit">USD / R130</span></p>',
    );
    expect(html).not.toContain("ZAR / $7.99");
    expect(html).not.toContain("moments-price-hero--usd");
    expect(html).not.toContain("moments-price-hero__usd");
    expect(html).not.toContain("moments-price-hero__note");
  });

  it("does not look up a country or a ?cc= override", () => {
    const price = readFileSync(path.resolve("src/lib/price-display.ts"), "utf8");
    const page = readFileSync(path.resolve("src/app/moments/page.tsx"), "utf8");
    const styles = readFileSync(path.resolve("src/app/globals.css"), "utf8");
    expect(price).not.toMatch(/priceLeadForCountry|countryForPrice/);
    expect(page).not.toContain("x-vercel-ip-country");
    expect(page).not.toMatch(/searchParams/);
    expect(styles).not.toMatch(/\.moments-price-hero--usd|\.moments-price-hero__usd|\.moments-price-hero__note/);
  });

  it("does not change the Payfast charge", () => {
    expect(PACK_AMOUNT).toBe("130.00");
    expect(PACK_AMOUNT).not.toBe("7.99");
  });
});
