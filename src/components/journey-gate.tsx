"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { AppProgress, BuyerGate } from "@/lib/journey";

export const BuyerGateContext = createContext<BuyerGate>("unknown");
export const AppProgressContext = createContext<AppProgress>("upload");

const ReportBuyerGateContext = createContext<((passed: boolean | null) => void) | null>(null);
const ReportAppProgressContext = createContext<((progress: AppProgress) => void) | null>(null);

export function JourneyProvider({ children }: { children: ReactNode }) {
  const [gate, setGate] = useState<BuyerGate>("unknown");
  const [appProgress, setAppProgress] = useState<AppProgress>("upload");
  const report = useCallback((passed: boolean | null) => {
    const next: BuyerGate = passed === null ? "unknown" : passed ? "open" : "locked";
    setGate((current) => (current === next ? current : next));
  }, []);
  const reportProgress = useCallback((next: AppProgress) => {
    setAppProgress((current) => (current === next ? current : next));
  }, []);

  return (
    <ReportBuyerGateContext.Provider value={report}>
      <ReportAppProgressContext.Provider value={reportProgress}>
        <BuyerGateContext.Provider value={gate}>
          <AppProgressContext.Provider value={appProgress}>{children}</AppProgressContext.Provider>
        </BuyerGateContext.Provider>
      </ReportAppProgressContext.Provider>
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

/** Moves the photo page from upload, to the good-in-this-moment question, to Turn my moment. */
export function useReportAppProgress(progress: AppProgress) {
  const report = useContext(ReportAppProgressContext);
  useEffect(() => {
    if (!report) return;
    report(progress);
    return () => report("upload");
  }, [report, progress]);
}
