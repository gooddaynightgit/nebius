/** Card lead. The Payfast charge stays 130.00 ZAR either way. */
export type PriceLead = "zar" | "usd";

export const PRICE_ZAR_AMOUNT = "R130";
export const PRICE_ZAR_UNIT = "ZAR / $7.99";
export const PRICE_USD_AMOUNT = "$7.99";
export const PRICE_USD_CODE = "USD";
export const PRICE_ZAR_NOTE = "R130 ZAR";

/**
 * South Africa, and a missing country (local dev, no geo header), keep the
 * rand lead. The United States and every other country lead with dollars.
 */
export function priceLeadForCountry(country: string | null | undefined): PriceLead {
  const code = (country ?? "").trim().toUpperCase();
  if (code === "ZA" || code === "") return "zar";
  return "usd";
}

/**
 * `?cc=US` overrides the Vercel geo header. A missing or invalid code falls
 * through to the header, then to the rand lead. Display only.
 */
export function countryForPrice(input: {
  cc?: string | null;
  geoCountry?: string | null;
}): string {
  const cc = (input.cc ?? "").trim().toUpperCase();
  if (/^[A-Z]{2}$/.test(cc)) return cc;
  const geo = (input.geoCountry ?? "").trim().toUpperCase();
  if (/^[A-Z]{2}$/.test(geo)) return geo;
  return "";
}
