import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { GradientPhrase } from "./GradientWord";

function textContent(html: string): string {
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

/** What a flex parent shows: whitespace-only items vanish, and edge spaces on each item trim. */
function flexVisibleText(html: string): string {
  const wrapped = html.match(/^<span class="inline-label">([\s\S]*)<\/span>$/);
  if (wrapped) return textContent(wrapped[1]);
  const parts = html.split(/(<span class="gradient-word">[\s\S]*?<\/span>)/);
  return parts
    .map((part) => {
      if (part.startsWith("<span")) return textContent(part);
      return part.replace(/\s+/g, " ").trim();
    })
    .filter(Boolean)
    .join("");
}

describe("gradient word spaces", () => {
  it("keeps spaces in the rendered text of both story actions and the joy link", () => {
    const create = renderToStaticMarkup(<GradientPhrase text="Create your new story" word="Create" />);
    const created = renderToStaticMarkup(<GradientPhrase text="See your Created story" word="Created" />);
    const joy = renderToStaticMarkup(
      <GradientPhrase text="See your Created story" word="Created" suffix=" →" />,
    );

    expect(textContent(create)).toBe("Create your new story");
    expect(textContent(created)).toBe("See your Created story");
    expect(textContent(joy)).toBe("See your Created story →");

    expect(flexVisibleText(create)).toBe("Create your new story");
    expect(flexVisibleText(created)).toBe("See your Created story");
    expect(flexVisibleText(joy)).toBe("See your Created story →");
  });

  it("still shows the spaces when the phrase is the only child of a flex button", () => {
    const button = renderToStaticMarkup(
      <button className="btn btn--lime" type="button">
        <GradientPhrase text="Create your new story" word="Create" />
      </button>,
    );
    const link = renderToStaticMarkup(
      <a className="btn btn--lime" href="/app/yours#earlier-stories">
        <GradientPhrase text="See your Created story" word="Created" />
      </a>,
    );
    expect(textContent(button)).toBe("Create your new story");
    expect(textContent(link)).toBe("See your Created story");
    expect(button).toMatch(/^<button[^>]*><span class="inline-label">/);
    expect(link).toMatch(/^<a[^>]*><span class="inline-label">See your <span class="gradient-word">Created<\/span> story<\/span><\/a>$/);
  });
});
