import { exactMatch } from "./exact";
import { fuzzyMatch } from "./fuzzy";
import { normalizeCode } from "./normalize";
import type { CatalogItemLite, MatchResult, StyleLite } from "./types";

/**
 * The deterministic pipeline (Stages 2–3), pure and DB-free so it can be unit
 * tested against a fixture catalog. Stage 1 (alias) and the future Stage 5
 * (LLM) are layered on top in index.ts, which has DB / network access.
 */
export function matchDeterministic(
  rawShorthand: string,
  items: CatalogItemLite[],
  style: StyleLite | null,
): MatchResult {
  const norm = normalizeCode(rawShorthand);
  if (!norm) {
    return { catalogItemId: null, method: "UNMATCHED", confidence: 0, candidates: [] };
  }
  const exact = exactMatch(norm, items, style);
  if (exact) return exact;
  return fuzzyMatch(norm, items, style);
}
