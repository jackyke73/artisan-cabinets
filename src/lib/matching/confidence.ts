import type { LineStatus } from "./types";

export const AUTO_ACCEPT_THRESHOLD = 0.9;
export const REVIEW_THRESHOLD = 0.6;

/** Confidence for an alias hit — grows with how many times staff have confirmed it. */
export function aliasConfidence(confirmCount: number): number {
  return Math.min(0.9 + Math.max(0, confirmCount) * 0.01, 0.99);
}

/** Map a confidence score to the line-item review status. */
export function statusForConfidence(confidence: number): LineStatus {
  if (confidence >= AUTO_ACCEPT_THRESHOLD) return "AUTO_ACCEPTED";
  if (confidence >= REVIEW_THRESHOLD) return "NEEDS_REVIEW";
  return "NEEDS_REVIEW"; // low confidence still surfaces for review, never auto-committed
}

/** True when a match is confident enough to accept without human review. */
export function isAutoAccept(confidence: number): boolean {
  return confidence >= AUTO_ACCEPT_THRESHOLD;
}
