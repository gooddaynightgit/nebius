import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { llmsFullText } from "./llms-full";
import { GOOD_NEWS_FAQ, siteJsonLd } from "./home-doors";

describe("LLM citable text", () => {
  it("builds llms-full.txt from the live copy, in the new wording", () => {
    const text = llmsFullText();
    expect(text).toContain("You scrolled past a hundred good moments today");
    expect(text).toContain("10.1037/0003-066X.60.5.410");
    for (const item of GOOD_NEWS_FAQ) expect(text).toContain(item.a);
    expect(text).not.toMatch(/story of your good day|tonight/i);
  });

  it("keeps llms.txt in the new wording and points at the full text", () => {
    const llms = readFileSync(path.resolve("public/llms.txt"), "utf8");
    expect(llms).toContain("https://gooddaynight.com/good-news");
    expect(llms).toContain("https://gooddaynight.com/llms-full.txt");
    expect(llms).not.toMatch(/story of your good day|tonight/i);
  });

  it("cites the study on the Good news page", () => {
    expect(JSON.stringify(siteJsonLd(true))).toContain("ScholarlyArticle");
    expect(JSON.stringify(siteJsonLd(false))).not.toContain("ScholarlyArticle");
  });
});
