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
    expect(joy).toMatch(/className="step-next step-pin"/);
    expect(joy).toMatch(/Unlock\/Capture/);
    expect(joy).not.toMatch(/step-back step-pin|step-pin step-back/);
    expect(joy.match(/step-pin/g)).toHaveLength(1);
    expect(checkout).toMatch(/className="moments-cta step-pin"/);
    expect(checkout).toMatch(/>\s*Unlock\s*</);
    expect(checkout.match(/step-pin/g)).toHaveLength(1);
    expect(capture).toMatch(/className="btn btn--turn step-pin"/);
    expect(capture).toMatch(/Weave my good moment/);
    expect(capture.match(/step-pin/g)).toHaveLength(1);
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
  });
});
