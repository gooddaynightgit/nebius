"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { BuyerGate } from "@/lib/journey";

export const BuyerGateContext = createContext<BuyerGate>("unknown");

const ReportBuyerGateContext = createContext<((passed: boolean | null) => void) | null>(null);

export function JourneyProvider({ children }: { children: ReactNode }) {
  const [gate, setGate] = useState<BuyerGate>("unknown");
  const report = useCallback((passed: boolean | null) => {
    const next: BuyerGate = passed === null ? "unknown" : passed ? "open" : "locked";
    setGate((current) => (current === next ? current : next));
  }, []);

  return (
    <ReportBuyerGateContext.Provider value={report}>
      <BuyerGateContext.Provider value={gate}>{children}</BuyerGateContext.Provider>
    </ReportBuyerGateContext.Provider>
  );
}

/** Mirrors CaptureStudio's buyer gate. `ready` stays false until session hydration settles. */
export function useReportBuyerGate(passed: boolean, ready: boolean) {
  const report = useContext(ReportBuyerGateContext);
  useEffect(() => {
    if (!report) return;
    report(ready ? passed : null);
    return () => report(null);
  }, [report, passed, ready]);
}
