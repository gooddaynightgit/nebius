import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import MomentsPrice from "@/components/MomentsPrice";
import { PACK_AMOUNT } from "@/lib/payfast";
import { countryForPrice, priceLeadForCountry } from "@/lib/price-display";

function markup(country: string): string {
  return renderToStaticMarkup(createElement(MomentsPrice, { country }));
}

describe("unlock card price by country", () => {
  it("keeps the big rand lead for South Africa and for an unknown country", () => {
    expect(priceLeadForCountry("ZA")).toBe("zar");
    expect(priceLeadForCountry("")).toBe("zar");
    expect(priceLeadForCountry(null)).toBe("zar");
    for (const html of [markup("ZA"), markup("")]) {
      expect(html).toContain('class="moments-price-hero__amount">R130');
      expect(html).toContain("ZAR / $7.99");
      expect(html).not.toContain("moments-price-hero--usd");
      expect(html).not.toContain(">$7.99<");
    }
  });

  it("leads with $7.99 for the United States and does not lead with R130", () => {
    expect(priceLeadForCountry("US")).toBe("usd");
    const html = markup("US");
    expect(html).toContain('class="moments-price-hero__amount">$7.99');
    expect(html).toContain('class="moments-price-hero__usd">USD');
    expect(html).toContain("R130 ZAR");
    expect(html).not.toContain('class="moments-price-hero__amount">R130');
    expect(html).not.toContain("ZAR / $7.99");
    const amountAt = html.indexOf("moments-price-hero__amount");
    const noteAt = html.indexOf("R130 ZAR");
    expect(amountAt).toBeGreaterThan(-1);
    expect(amountAt).toBeLessThan(noteAt);
  });

  it("uses the dollar lead for other countries", () => {
    expect(priceLeadForCountry("GB")).toBe("usd");
    expect(priceLeadForCountry("DE")).toBe("usd");
    expect(markup("GB")).toContain('class="moments-price-hero__amount">$7.99');
  });

  it("lets ?cc= override geo, and ignores a code that is not two letters", () => {
    expect(countryForPrice({ cc: "us", geoCountry: "ZA" })).toBe("US");
    expect(countryForPrice({ cc: "ZA", geoCountry: "US" })).toBe("ZA");
    expect(countryForPrice({ cc: "USA", geoCountry: "ZA" })).toBe("ZA");
    expect(countryForPrice({ cc: "", geoCountry: "de" })).toBe("DE");
    expect(countryForPrice({ cc: null, geoCountry: null })).toBe("");
  });

  it("does not change the Payfast charge when the card leads with dollars", () => {
    expect(PACK_AMOUNT).toBe("130.00");
    expect(markup("US")).toContain("$7.99");
    expect(PACK_AMOUNT).not.toBe("7.99");
  });
});
