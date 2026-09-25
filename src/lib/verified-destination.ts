import { getEntitlement } from "./entitlement";
import { destinationAfterVerifiedLogin, PAYMENT_HREF } from "./login-destination";

/**
 * Server-side `goodfans` lookup for a verified email.
 * A thrown read (Dynamo down, unreadable balance) falls back to payment.
 * It never sends the visitor back to the email screen.
 */
export async function destinationForVerifiedEmail(
  email: string,
): Promise<"/app" | "/moments"> {
  try {
    const row = await getEntitlement(email);
    return destinationAfterVerifiedLogin(row ? row.remaining : null);
  } catch {
    return PAYMENT_HREF;
  }
}
