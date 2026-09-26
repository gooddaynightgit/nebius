/** Purchase only. The verified email is the session, not a field on this page. */
export default function MomentsCheckout() {
  return (
    <form className="moments-buy" method="post" action="/api/payfast/checkout">
      <button className="moments-cta step-pin" type="submit">
        Unlock
      </button>
    </form>
  );
}
