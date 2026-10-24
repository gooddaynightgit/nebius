import { Suspense } from "react";
import YoursStory from "@/components/YoursStory";
import { NOINDEX, siteTitleMetadata } from "@/lib/site-title";

export const metadata = { ...siteTitleMetadata, robots: NOINDEX };

export default function YoursPage() {
  return (
    <Suspense fallback={null}>
      <YoursStory />
    </Suspense>
  );
}
