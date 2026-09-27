import { Suspense } from "react";
import YoursStory from "@/components/YoursStory";
import { siteTitleMetadata } from "@/lib/site-title";

export const metadata = siteTitleMetadata;

export default function YoursPage() {
  return (
    <Suspense fallback={null}>
      <YoursStory />
    </Suspense>
  );
}
