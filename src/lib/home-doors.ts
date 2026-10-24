/** The home page is only two doors: the brand circle and the brand square. */
export const FEEL_GOOD_HREF = "/app/joy";
export const GOOD_NEWS_HREF = "/good-news";

export const FEEL_GOOD_LABEL = "How to feel good";
export const GOOD_NEWS_LABEL = "Good news";

export const HOME_DESCRIPTION =
  "GoodDayNight is a daily gratitude habit. Notice something good in your day, snap it, and get it reflected back to you in a few warm words.";

export const FEEL_GOOD_HEADLINE =
  "You scrolled past a hundred good moments today. None of them were yours.";
export const FEEL_GOOD_LEAD =
  "Your laugh. Your small win. Your quiet moment. Nobody turned them into anything — not even you.";

/** Jasmine's why, in her own words. */
export const MAKER_WHY = [
  "After 36 years as a software engineer, I wanted to become a better person, one day at a time.",
  "Every path I looked at came back to gratitude.",
  "So I built GoodDayNight, and it's changing me for the better.",
] as const;
export const MAKER_SIGN = "Jasmine, maker of GoodDayNight";

export const GOOD_NEWS_FAQ = [
  {
    q: "What is GoodDayNight?",
    a: "GoodDayNight is a daily gratitude habit for adults. Notice something good in your day, snap it, and get it reflected back to you in a few warm words.",
  },
  {
    q: "How does it work?",
    a: "Pick your joy, snap a photo from today, and say what was good in it. GoodDayNight reflects it back to you in a few warm words. On a harder day, open Something Good: name what you're not grateful for, take one slow breath, and turn it around.",
  },
  {
    q: "Can I save more than one moment a day?",
    a: "Yes. Save as many good moments as you like. Each one gets its own reflection.",
  },
  {
    q: "What happens to my moments after today?",
    a: "Today's moments are for today, then they're gone. Tomorrow you look again.",
  },
  {
    q: "Does gratitude journaling really work?",
    a: "In a well-known study, people who wrote down three good things each night for a week felt happier for up to six months afterwards.",
  },
  {
    q: "Is my photo private?",
    a: "Your photos are used only to write your reflection and are deleted after today. We never share or sell them.",
  },
] as const;

export const SITE_KEYWORDS =
  "gratitude journal, gratitude app, daily gratitude habit, feel good, less scrolling, find joy, positive mindset, mindfulness, three good things, turn your day around";

/** Structured data so search engines and AI assistants can read what GoodDayNight is. */
export function siteJsonLd(withFaq: boolean) {
  const graph: object[] = [
    {
      "@type": "WebApplication",
      "@id": "https://gooddaynight.com/#app",
      name: "GoodDayNight",
      url: "https://gooddaynight.com/",
      description: HOME_DESCRIPTION,
      applicationCategory: "LifestyleApplication",
      operatingSystem: "Web",
      keywords: SITE_KEYWORDS,
      email: "hello@gooddaynight.com",
      inLanguage: "en-US",
      publisher: { "@id": "https://gooddaynight.com/#org" },
      audience: { "@type": "PeopleAudience", suggestedMinAge: 18 },
      offers: {
        "@type": "Offer",
        name: "25 good moments",
        price: "7.99",
        priceCurrency: "USD",
        url: "https://gooddaynight.com/pack",
      },
    },
    {
      "@type": "Organization",
      "@id": "https://gooddaynight.com/#org",
      name: "GoodDayNight",
      url: "https://gooddaynight.com/",
      logo: "https://gooddaynight.com/logo.svg",
      email: "hello@gooddaynight.com",
      description: `${HOME_DESCRIPTION} It is not affiliated with Good Day Good Night of Tucson.`,
      founder: { "@type": "Person", name: "Jasmine Hassam", url: "https://gooddaynight.com/about" },
    },
    {
      "@type": "WebSite",
      "@id": "https://gooddaynight.com/#website",
      name: "GoodDayNight",
      url: "https://gooddaynight.com/",
      inLanguage: "en-US",
      publisher: { "@id": "https://gooddaynight.com/#org" },
    },
  ];
  if (withFaq) {
    graph.push({
      "@type": "FAQPage",
      mainEntity: GOOD_NEWS_FAQ.map((item) => ({
        "@type": "Question",
        name: item.q,
        acceptedAnswer: { "@type": "Answer", text: item.a },
      })),
    });
  }
  return { "@context": "https://schema.org", "@graph": graph };
}

export function jsonLdHtml(data: object) {
  return { __html: JSON.stringify(data).replace(/</g, "\\u003c") };
}
