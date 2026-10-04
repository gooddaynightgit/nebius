import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import AccountMenu from "@/components/AccountMenu";
import FeedbackRibbon from "@/components/FeedbackRibbon";
import JourneyProgress from "@/components/JourneyProgress";
import { JourneyProvider } from "@/components/journey-gate";
import { StepForwardProvider } from "@/components/step-forward";
import { googleTagSnippet } from "@/lib/google-ads";
import { SITE_TITLE } from "@/lib/site-title";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: SITE_TITLE,
  description:
    "GoodDayNight turns what you texted, photographed, or voice-noted during the day into a bedtime story read back to you.",
  metadataBase: new URL("https://gooddaynight.com"),
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-32.png", type: "image/png", sizes: "32x32" },
    ],
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
  openGraph: {
    type: "website",
    url: "https://gooddaynight.com/",
    title: SITE_TITLE,
    description:
      "GoodDayNight turns what you texted, photographed, or voice-noted during the day into a bedtime story read back to you.",
    locale: "en_US",
    siteName: "GoodDayNight",
  },
  twitter: {
    card: "summary",
    title: SITE_TITLE,
    description:
      "GoodDayNight turns what you texted, photographed, or voice-noted during the day into a bedtime story read back to you.",
  },
};

export const viewport: Viewport = {
  themeColor: "#D4FF00",
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const tag = googleTagSnippet();
  return (
    <html lang="en">
      <body className={inter.className}>
        <Script src={tag.src} strategy="afterInteractive" />
        <Script id="google-tag" strategy="afterInteractive">
          {tag.html}
        </Script>
        <JourneyProvider>
          <StepForwardProvider>
            <a className="skip-link" href="#main">
              Skip to content
            </a>
            <JourneyProgress />
            {children}
            <AccountMenu />
            <FeedbackRibbon />
          </StepForwardProvider>
        </JourneyProvider>
      </body>
    </html>
  );
}
