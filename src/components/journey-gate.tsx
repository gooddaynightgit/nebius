"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { BuyerGate } from "@/lib/journey";

export const BuyerGateContext = createContext<BuyerGate>("unknown");
export const JourneyCaptionContext = createContext<string | null>(null);

const ReportBuyerGateContext = createContext<((passed: boolean | null) => void) | null>(null);
const ReportJourneyCaptionContext = createContext<((caption: string | null) => void) | null>(null);

export function JourneyProvider({ children }: { children: ReactNode }) {
  const [gate, setGate] = useState<BuyerGate>("unknown");
  const [caption, setCaption] = useState<string | null>(null);
  const report = useCallback((passed: boolean | null) => {
    const next: BuyerGate = passed === null ? "unknown" : passed ? "open" : "locked";
    setGate((current) => (current === next ? current : next));
  }, []);
  const reportCaption = useCallback((next: string | null) => {
    setCaption((current) => (current === next ? current : next));
  }, []);

  return (
    <ReportBuyerGateContext.Provider value={report}>
      <ReportJourneyCaptionContext.Provider value={reportCaption}>
        <BuyerGateContext.Provider value={gate}>
          <JourneyCaptionContext.Provider value={caption}>{children}</JourneyCaptionContext.Provider>
        </BuyerGateContext.Provider>
      </ReportJourneyCaptionContext.Provider>
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

/** Replaces the active progress caption while a step is in progress. */
export function useJourneyCaption(caption: string | null) {
  const report = useContext(ReportJourneyCaptionContext);
  useEffect(() => {
    if (!report) return;
    report(caption);
    return () => report(null);
  }, [report, caption]);
}
