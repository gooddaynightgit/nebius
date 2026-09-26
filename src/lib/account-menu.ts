import { SIGN_IN_HREF } from "./login-destination";

export type AccountMenuItem =
  | { kind: "email"; email: string }
  | { kind: "link"; label: string; href: string }
  | { kind: "logout"; label: "Log out" };

const REVIEW = { kind: "link" as const, label: "Leave a review", href: "/review" };
const ABOUT = { kind: "link" as const, label: "About the maker", href: "/about" };

/** Menu rows for the floating bubble. Saved moments are not part of this list. */
export function accountMenuItems(input: {
  signedIn: boolean;
  email?: string | null;
}): AccountMenuItem[] {
  if (!input.signedIn) {
    return [{ kind: "link", label: "Sign in", href: SIGN_IN_HREF }, REVIEW, ABOUT];
  }
  return [
    { kind: "email", email: input.email?.trim() || "" },
    { kind: "link", label: "My moments", href: "/moments" },
    { kind: "logout", label: "Log out" },
    REVIEW,
    ABOUT,
  ];
}
