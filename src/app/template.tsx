"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/**
 * Client navigation can show a page again without remounting it, so a busy
 * flag or a saved-moments radio survives until refresh. Keying on the path
 * mounts a fresh page on each arrival, which is what that refresh did.
 */
export default function Template({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname ?? ""} style={{ display: "contents" }}>
      {children}
    </div>
  );
}
