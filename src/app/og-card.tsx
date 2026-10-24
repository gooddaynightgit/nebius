import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

const font = (f: string) => readFile(join(process.cwd(), "src/app/fonts", f));

export const ogAlt = "GoodDayNight — Find the joy in your day, or turn the day around";
export const ogSize = { width: 1200, height: 630 };

/**
 * 1200x630 share card, on brand: lime, ink.
 * All content sits in a centred ~600px-wide safe area so LinkedIn, X,
 * WhatsApp, Facebook and iMessage crops (incl. 1:1 centre crops) keep it whole.
 */
export async function renderOgCard() {
  const [black, bold] = await Promise.all([font("Inter-Black.ttf"), font("Inter-Bold.ttf")]);
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#D4FF00",
          color: "#000000",
          fontFamily: "Inter",
        }}
      >
        <div
          style={{
            width: 600,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
          }}
        >
          <div style={{ display: "flex", fontSize: 48, fontWeight: 900, letterSpacing: -1, marginBottom: 24 }}>GoodDayNight</div>
          <div style={{ display: "flex", fontSize: 58, fontWeight: 900, letterSpacing: -1.5, lineHeight: 1.05, textAlign: "center", justifyContent: "center" }}>
            Find the joy in your day, or turn the day around.
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", fontSize: 27, fontWeight: 700, marginTop: 26, lineHeight: 1.35 }}>
            <div style={{ display: "flex" }}>Two ways in. One story of your good day.</div>
            <div style={{ display: "flex" }}>gooddaynight.com</div>
          </div>
        </div>
      </div>
    ),
    {
      ...ogSize,
      fonts: [
        { name: "Inter", data: black, weight: 900, style: "normal" },
        { name: "Inter", data: bold, weight: 700, style: "normal" },
      ],
    },
  );
}
