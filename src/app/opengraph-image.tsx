import { ogAlt, ogSize, renderOgCard } from "./og-card";

export const alt = ogAlt;
export const size = ogSize;
export const contentType = "image/png";

export default async function OpenGraphImage() {
  return renderOgCard();
}
