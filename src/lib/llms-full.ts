import { FAQ, HOW_IT_WORKS_BODY, NO_BLANK_PAGE_BODY, NOT_A_LIST_BODY, PACK_BODY } from "./guide-pages";
import { FEEL_GOOD_HEADLINE, FEEL_GOOD_LEAD, GOOD_NEWS_FAQ, HOME_DESCRIPTION, MAKER_WHY } from "./home-doors";
import { SG_DESCRIPTION, SG_FAQ, SG_HOW_NOTE, SG_HOW_STEPS } from "./something-good";

export const STUDY_CITATION =
  'Seligman, Steen, Park & Peterson (2005), "Positive psychology progress: Empirical validation of interventions," American Psychologist, 60(5), 410–421. https://doi.org/10.1037/0003-066X.60.5.410';

function qa(items: readonly { q: string; a: string }[]) {
  return items.map((item) => `### ${item.q}\n${item.a}`).join("\n\n");
}

/** Every citable word on GoodDayNight in one plain-text file, built from the same copy the pages use. */
export function llmsFullText() {
  return `# GoodDayNight — full text

> ${HOME_DESCRIPTION}

Website: https://gooddaynight.com
Contact: hello@gooddaynight.com
Audience: adults (18+)
Price: 25 good moments for R130 (about $7.99), shown in your local currency at Payfast checkout. No subscription on this pack.
Maker: Jasmine Hassam (https://gooddaynight.com/about)
Not affiliated with Good Day Good Night of Tucson.

## Good news (https://gooddaynight.com/good-news)
${FEEL_GOOD_HEADLINE}

${FEEL_GOOD_LEAD}

## Why it works
In a well-known study, people who wrote down three good things each night for one week felt happier, and the effect lasted up to six months. GoodDayNight builds on that same simple habit: notice what went well today, save it, and get it reflected back to you in a few warm words.

Source: ${STUDY_CITATION}. The "Three Good Things" exercise.

## Questions
${qa(GOOD_NEWS_FAQ)}

## How it works (https://gooddaynight.com/how-it-works)
${HOW_IT_WORKS_BODY}

## No blank page (https://gooddaynight.com/no-blank-page)
${NO_BLANK_PAGE_BODY}

## Not a list (https://gooddaynight.com/not-a-list)
${NOT_A_LIST_BODY}

## Pack and price (https://gooddaynight.com/pack)
${PACK_BODY} $7.99 / R130.

## More questions (https://gooddaynight.com/faq)
${qa(FAQ)}

## Why the maker built it
${MAKER_WHY.join(" ")}

## Something Good (https://gooddaynight.com/something-good)
> ${SG_DESCRIPTION}

${SG_HOW_STEPS.map((step, i) => `${i + 1}. ${step.title}: ${step.body}`).join("\n")}

${SG_HOW_NOTE}

### Something Good questions
${qa(SG_FAQ)}
`;
}

