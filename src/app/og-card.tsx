import { ImageResponse } from "next/og";

export const ogAlt = "GoodDayNight — Gratitude Journal & Bedtime Stories";
export const ogSize = { width: 1200, height: 630 };

/**
 * 1200x630 share card, on brand: lime, ink.
 * All content sits in a centred ~560px-wide safe area so LinkedIn, X,
 * WhatsApp, Facebook and iMessage crops (incl. 1:1 centre crops) keep it whole.
 */
export function renderOgCard() {
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
          color: "#111111",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            width: 520,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
          }}
        >
          <div style={{ display: "flex", fontSize: 40, fontWeight: 800, marginBottom: 28 }}>GoodDayNight</div>
          <div style={{ display: "flex", fontSize: 46, fontWeight: 800, lineHeight: 1.12, textAlign: "center", justifyContent: "center" }}>
            Your good moments, read back as a bedtime story tonight.
          </div>
          <div style={{ display: "flex", fontSize: 22, fontWeight: 600, marginTop: 28, textAlign: "center", justifyContent: "center" }}>
            A gratitude journal for adults · gooddaynight.com
          </div>
        </div>
      </div>
    ),
    ogSize,
  );
}
