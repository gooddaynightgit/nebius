import {
  PRICE_USD_AMOUNT,
  PRICE_USD_CODE,
  PRICE_ZAR_AMOUNT,
  PRICE_ZAR_NOTE,
  PRICE_ZAR_UNIT,
  priceLeadForCountry,
} from "@/lib/price-display";

/** Unlock-card price. Rand lead for ZA and unknown; dollar lead everywhere else. */
export default function MomentsPrice({ country }: { country: string }) {
  if (priceLeadForCountry(country) === "zar") {
    return (
      <p className="moments-price-hero">
        <span className="moments-price-hero__amount">{PRICE_ZAR_AMOUNT}</span>
        <span className="moments-price-hero__unit">{PRICE_ZAR_UNIT}</span>
      </p>
    );
  }
  return (
    <p className="moments-price-hero moments-price-hero--usd">
      <span className="moments-price-hero__amount">{PRICE_USD_AMOUNT}</span>
      <span className="moments-price-hero__usd">{PRICE_USD_CODE}</span>
      <span className="moments-price-hero__note">{PRICE_ZAR_NOTE}</span>
    </p>
  );
}
