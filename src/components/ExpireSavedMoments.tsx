"use client";

import { useEffect } from "react";
import { useLocalDay, withClientClock } from "@/lib/client-day";

/** Opening My new joy moments drops saved moments whose local day has ended. */
export default function ExpireSavedMoments() {
  const day = useLocalDay();
  useEffect(() => {
    void fetch(withClientClock(`/api/session?day=${encodeURIComponent(day)}`), {
      credentials: "same-origin",
      cache: "no-store",
    }).catch(() => undefined);
  }, [day]);
  return null;
}
