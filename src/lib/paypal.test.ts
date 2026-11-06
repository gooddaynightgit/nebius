import { describe, expect, it } from "vitest";
import { PAYPAL_AMOUNT, decidePaypalOrder, paypalOrderBody } from "./paypal";

const ref = "pay_abc123";

function order(overrides: Record<string, unknown> = {}) {
  return {
    status: "COMPLETED",
    purchase_units: [
      {
        reference_id: ref,
        invoice_id: ref,
        custom_id: "Buyer@Example.com",
        payments: {
          captures: [
            { id: "3C679366HH908993F", status: "COMPLETED", amount: { currency_code: "USD", value: PAYPAL_AMOUNT } },
          ],
        },
        ...overrides,
      },
    ],
  };
}

describe("decidePaypalOrder", () => {
  it("accepts a completed capture for our ref", () => {
    expect(decidePaypalOrder(order(), ref)).toEqual({
      ok: true,
      email: "buyer@example.com",
      captureId: "3C679366HH908993F",
    });
  });

  it("rejects another ref, amount, or status", () => {
    expect(decidePaypalOrder(order(), "pay_other").ok).toBe(false);
    expect(
      decidePaypalOrder(
        order({ payments: { captures: [{ id: "X1", status: "COMPLETED", amount: { currency_code: "USD", value: "1.00" } }] } }),
        ref,
      ).ok,
    ).toBe(false);
    expect(decidePaypalOrder({ ...order(), status: "APPROVED" }, ref).ok).toBe(false);
    expect(decidePaypalOrder(null, ref).ok).toBe(false);
  });
});

describe("paypalOrderBody", () => {
  it("charges the PayPal amount in USD and returns to our return route", () => {
    const body = paypalOrderBody("a@b.co", ref, "https://gooddaynight.com");
    expect(body.purchase_units[0].amount).toEqual({ currency_code: "USD", value: PAYPAL_AMOUNT });
    expect(body.payment_source.paypal.experience_context.return_url).toBe(
      "https://gooddaynight.com/api/paypal/return?ref=pay_abc123",
    );
  });
});
