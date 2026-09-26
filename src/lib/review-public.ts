import { REVIEW_FRIEND } from "./review-copy";

export type PublicReview = {
  id: string;
  stars: 4 | 5;
  comment: string;
  name: string;
  createdAt: string;
};

export function reviewShouldPublish(stars: number | null): boolean {
  return stars === 4 || stars === 5;
}

/** First word of a name, or a stand-in. An email in the name field is never shown. */
export function firstNameOnly(name: string): string {
  const token = name.trim().split(/\s+/)[0]?.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}'’-]+$/gu, "") ?? "";
  if (!token || token.includes("@")) return REVIEW_FRIEND;
  return token;
}

export function toPublicReview(review: {
  id: string;
  stars: number | null;
  comment: string;
  name: string;
  createdAt: string;
  published?: boolean;
}): PublicReview | null {
  if (review.published !== true) return null;
  if (review.stars !== 4 && review.stars !== 5) return null;
  return {
    id: review.id,
    stars: review.stars,
    comment: review.comment,
    name: firstNameOnly(review.name),
    createdAt: review.createdAt,
  };
}

export function newestReviews<T extends { createdAt: string }>(reviews: T[], limit?: number): T[] {
  const sorted = [...reviews].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return typeof limit === "number" ? sorted.slice(0, limit) : sorted;
}
