import { ImageResponse } from "next/og";

export const alt = "GoodDayNight — Gratitude Journal & Bedtime Stories";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** 1200x630 share card, on brand: lime, ink, one line. */
export default function TwitterImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#D4FF00",
          color: "#111111",
          padding: "72px 80px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 44, fontWeight: 800 }}>GoodDayNight</div>
        <div style={{ display: "flex", fontSize: 76, fontWeight: 800, lineHeight: 1.05, maxWidth: 1000 }}>
          Your good moments, read back as a bedtime story tonight.
        </div>
        <div style={{ display: "flex", fontSize: 32, fontWeight: 600 }}>
          A gratitude journal for adults · gooddaynight.com
        </div>
      </div>
    ),
    size,
  );
}
