/**
 * Buy-page Payfast form. The visible "Pay R130 by card" and PayPal buttons live
 * in the price card; this hidden form stays as a no-JS fallback target. It no
 * longer registers the floating "Capture it" step button (removed Nov 2026).
 */
export default function MomentsCheckout() {
  return (
    <form id="moments-buy" className="moments-buy" method="post" action="/api/payfast/checkout">
      <button className="visually-hidden" type="submit">
        Unlock
      </button>
    </form>
  );
}
