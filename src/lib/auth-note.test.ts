import { describe, expect, it } from "vitest";
import { REQUEST_SENT, REQUEST_UNAVAILABLE, VERIFY_FAIL } from "./otp";
import { authAttempt } from "./auth-note";

describe("auth attempt notes", () => {
  it("shows the sent line when the code request is accepted", () => {
    expect(authAttempt({ ok: true, message: REQUEST_SENT }, true, "fallback")).toEqual({
      accepted: true,
      note: REQUEST_SENT,
    });
  });

  it("shows the verify failure instead of an outage", () => {
    expect(authAttempt({ ok: false, message: VERIFY_FAIL }, false, "We couldn’t check that code right now.")).toEqual({
      accepted: false,
      note: VERIFY_FAIL,
    });
  });

  it("shows the send error from a 503", () => {
    expect(authAttempt({ error: REQUEST_UNAVAILABLE }, false, "fallback")).toEqual({
      accepted: false,
      note: REQUEST_UNAVAILABLE,
    });
  });
});
