import { PRICE_USD_AMOUNT, PRICE_USD_UNIT } from "@/lib/price-display";

/** One unlock-card price for every visitor. */
export default function MomentsPrice() {
  return (
    <p className="moments-price-hero">
      <span className="moments-price-hero__amount">{PRICE_USD_AMOUNT}</span>
      <span className="moments-price-hero__unit">{PRICE_USD_UNIT}</span>
    </p>
  );
}
