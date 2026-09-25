export type AuthBody = {
  ok?: boolean;
  message?: string;
  error?: string;
  /** Server path after a verified code: `/app` or `/moments`. */
  next?: string;
};

/**
 * Email-code buttons. A 400 `{ ok: false, message }` is the server's answer.
 * Only a missing body falls back to the outage line.
 */
export function authAttempt(
  body: AuthBody,
  httpOk: boolean,
  fallback: string,
): { accepted: boolean; note: string } {
  const note = (body.message || body.error || "").trim() || fallback;
  const accepted = httpOk && body.ok !== false && !body.error;
  return { accepted, note };
}
