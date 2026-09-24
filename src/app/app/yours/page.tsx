import { Suspense } from "react";
import YoursStory from "@/components/YoursStory";

export default function YoursPage() {
  return (
    <Suspense fallback={null}>
      <YoursStory />
    </Suspense>
  );
}
