import {
  PRICE_USD_AMOUNT,
  PRICE_USD_UNIT,
  PRICE_ZAR_AMOUNT,
  PRICE_ZAR_UNIT,
  priceLeadForCountry,
} from "@/lib/price-display";

/** Unlock-card price. Same markup either way; the amount and unit swap. */
export default function MomentsPrice({ country }: { country: string }) {
  const usd = priceLeadForCountry(country) === "usd";
  return (
    <p className="moments-price-hero">
      <span className="moments-price-hero__amount">{usd ? PRICE_USD_AMOUNT : PRICE_ZAR_AMOUNT}</span>
      <span className="moments-price-hero__unit">{usd ? PRICE_USD_UNIT : PRICE_ZAR_UNIT}</span>
    </p>
  );
}
