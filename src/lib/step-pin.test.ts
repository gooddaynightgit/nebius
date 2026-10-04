import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function read(file: string): string {
  return readFileSync(path.resolve(file), "utf8");
}

describe("pinned step button", () => {
  const styles = read("src/app/globals.css");
  const landing = read("src/app/page.tsx");
  const joy = read("src/components/JoyStudio.tsx");
  const checkout = read("src/components/MomentsCheckout.tsx");
  const capture = read("src/components/CaptureStudio.tsx");
  const signin = read("src/components/SignInForm.tsx");

  it("pins one primary advance button on each step page", () => {
    expect(landing).toMatch(/className="step-next step-pin"/);
    expect(landing.match(/step-pin/g)).toHaveLength(1);
    expect(joy).toMatch(/Unlock\/Capture/);
    expect(joy).not.toMatch(/step-pin/);
    expect(checkout).toMatch(/type="submit"/);
    expect(checkout).toMatch(/>\s*Unlock\s*</);
    expect(checkout).not.toMatch(/step-pin/);
    expect(capture).toMatch(/Weave my good moment/);
    expect(capture).not.toMatch(/step-pin/);
    expect(signin).not.toMatch(/step-pin/);
  });

  it("holds the button above the hamburger and the ticker", () => {
    expect(styles).toMatch(/\.step-pin\s*\{[^}]*position:\s*fixed;/);
    expect(styles).toMatch(/\.step-pin\s*\{[^}]*z-index:\s*44;/);
    expect(styles).toMatch(
      /\.step-pin\s*\{[^}]*bottom:\s*calc\(2\.75rem \+ env\(safe-area-inset-bottom\) \+ 0\.5rem \+ 48px \+ 0\.55rem\);/,
    );
    expect(styles).toMatch(/\.account-menu\s*\{[^}]*z-index:\s*45;/);
    expect(styles).toMatch(/\.feedback-ribbon\s*\{[^}]*z-index:\s*40;/);
    expect(styles).toMatch(/body:has\(\.step-pin\)\s*\{[^}]*padding-bottom:/);
    expect(styles).toMatch(/--review-ticker-height:\s*calc\(2\.75rem \+ env\(safe-area-inset-bottom\)\)/);
    expect(styles).toMatch(/--step-float-height:\s*44px/);
    expect(styles).toMatch(
      /--step-float-clearance:\s*calc\(var\(--review-ticker-height\) \+ 0\.5rem \+ 48px \+ 0\.45rem \+ var\(--step-float-height\) \+ 24px\)/,
    );
    expect(styles).toMatch(/body:has\(\.step-float\)\s*\{[^}]*padding-bottom:\s*var\(--step-float-clearance\)/);
    expect(styles).toMatch(
      /body:has\(\.step-float\):has\(\.share-pin\)\s*\{[^}]*padding-bottom:\s*calc\(2\.75rem \+ env\(safe-area-inset-bottom\) \+ 0\.5rem \+ 48px \+ 0\.45rem \+ 44px \+ 0\.45rem \+ 6\.25rem \+ 1\.15rem\);/,
    );
    expect(styles).toMatch(/\.step-float\s*\{[^}]*position:\s*fixed;/);
    expect(styles).toMatch(/\.step-float\s*\{[^}]*z-index:\s*44;/);
    expect(styles).toMatch(
      /\.step-float\s*\{[^}]*bottom:\s*calc\(2\.75rem \+ env\(safe-area-inset-bottom\) \+ 0\.5rem \+ 48px \+ 0\.45rem\);/,
    );
    expect(styles).toMatch(/\.step-float\s*\{[^}]*right:\s*max\(0\.7rem, env\(safe-area-inset-right\)\);/);
    expect(styles).toMatch(/\.step-float__back\s*\{[^}]*min-width:\s*44px/);
    expect(styles).toMatch(/\.step-float__next\s*\{[^}]*min-height:\s*44px/);
    expect(styles).toMatch(/\.step-float__next:disabled\s*\{[^}]*color:\s*#c5d0da/);
  });
});
