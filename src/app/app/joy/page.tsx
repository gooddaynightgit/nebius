import JoyStudio from "@/components/JoyStudio";
import { NOINDEX, siteTitleMetadata } from "@/lib/site-title";

export const metadata = { ...siteTitleMetadata, robots: NOINDEX };

export default function JoyPage() {
  return <JoyStudio />;
}
