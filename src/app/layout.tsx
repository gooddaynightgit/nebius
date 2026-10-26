import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import AccountMenu from "@/components/AccountMenu";
import FeedbackRibbon from "@/components/FeedbackRibbon";
import JourneyProgress from "@/components/JourneyProgress";
import { JourneyProvider } from "@/components/journey-gate";
import { StepForwardProvider } from "@/components/step-forward";
import { googleTagSnippet } from "@/lib/google-ads";
import { HOME_DESCRIPTION } from "@/lib/home-doors";
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
    HOME_DESCRIPTION,
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
      HOME_DESCRIPTION,
    locale: "en_US",
    siteName: "GoodDayNight",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description:
      HOME_DESCRIPTION,
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
        {/* Vercel Web Analytics — counts visitors and page views per page */}
        <Script id="vercel-analytics-queue" strategy="afterInteractive">
          {`window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };`}
        </Script>
        <Script src="/_vercel/insights/script.js" strategy="afterInteractive" />
        {/* OpenAI (ChatGPT) Ads pixel — data source "sales pixel" */}
        <Script id="openai-ads-pixel" strategy="afterInteractive">
          {`!function(w,d,s,u){if(w.oaiq)return;var q=function(){q.q.push(arguments)};q.q=[];w.oaiq=q;var j=d.createElement(s);j.async=1;j.src=u;var f=d.getElementsByTagName(s)[0];f.parentNode.insertBefore(j,f)}(window,document,"script","https://bzrcdn.openai.com/sdk/oaiq.min.js");oaiq("init",{pixelId:"YPtayFGEobn3D2fm4MWinB"});`}
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
