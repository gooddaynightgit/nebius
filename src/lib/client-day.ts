"use client";

import { useEffect, useState } from "react";
import { localDay } from "./day";
import { msUntilLocalMidnight } from "./moment-expiry";

/** Local calendar day that advances at midnight so expiry is not stuck on a memoized date. */
export function useLocalDay(): string {
  const [day, setDay] = useState(() => localDay());
  useEffect(() => {
    let timer = 0;
    const arm = () => {
      timer = window.setTimeout(() => {
        setDay(localDay());
        arm();
      }, msUntilLocalMidnight() + 30);
    };
    arm();
    return () => window.clearTimeout(timer);
  }, []);
  return day;
}

/** Append the phone's UTC offset so the server can expire moments on the local calendar day. */
export function withClientClock(path: string): string {
  const join = path.includes("?") ? "&" : "?";
  return `${path}${join}tzOffset=${encodeURIComponent(String(new Date().getTimezoneOffset()))}`;
}
