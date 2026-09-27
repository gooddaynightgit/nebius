import { SIGN_IN_HREF } from "./login-destination";

export type AccountMenuItem =
  | { kind: "email"; email: string }
  | { kind: "link"; label: string; href: string }
  | { kind: "logout"; label: "Log out" };

const REVIEW = { kind: "link" as const, label: "Leave a review", href: "/review" };
const ABOUT = { kind: "link" as const, label: "About the maker", href: "/about" };
const HOW_IT_WORKS = { kind: "link" as const, label: "How it works", href: "/how-it-works" };
const EXAMPLE = { kind: "link" as const, label: "Example", href: "/example" };
const FAQ = { kind: "link" as const, label: "FAQ", href: "/faq" };
const GUIDE_LINKS = [HOW_IT_WORKS, EXAMPLE, FAQ];

/** Menu rows for the floating bubble. Saved moments are not part of this list. */
export function accountMenuItems(input: {
  signedIn: boolean;
  email?: string | null;
}): AccountMenuItem[] {
  if (!input.signedIn) {
    return [{ kind: "link", label: "Sign in", href: SIGN_IN_HREF }, REVIEW, ABOUT, ...GUIDE_LINKS];
  }
  return [
    { kind: "email", email: input.email?.trim() || "" },
    { kind: "link", label: "My new joy moments", href: "/moments" },
    { kind: "logout", label: "Log out" },
    REVIEW,
    ABOUT,
    ...GUIDE_LINKS,
  ];
}
