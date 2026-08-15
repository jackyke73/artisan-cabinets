import { normalizeCode } from "./normalize";
import type { CatalogItemLite, MatchResult, StyleLite } from "./types";

function candidateFrom(item: CatalogItemLite, score: number) {
  return {
    catalogItemId: item.id,
    sku: item.sku,
    description: item.description,
    priceCents: item.priceCents,
    score,
  };
}

/**
 * Stage 2 — exact normalized match.
 *  1. shorthand normalizes to a full SKU (customer typed the whole code).
 *  2. within the chosen style, shorthand equals a size code
 *     (e.g. "B15" under style "BPS" -> the item whose sizeCode is "B15" = BPS-B15).
 * Pure: takes the catalog in memory, no DB.
 */
export function exactMatch(
  normalizedShorthand: string,
  items: CatalogItemLite[],
  style: StyleLite | null,
): MatchResult | null {
  // 1. Direct full-SKU hit.
  const bySku = items.find((i) => i.normalizedSku === normalizedShorthand);
  if (bySku) {
    return { catalogItemId: bySku.id, method: "EXACT", confidence: 0.98, candidates: [candidateFrom(bySku, 0.98)] };
  }

  // 2. Size code within the chosen style.
  if (style) {
    const bySize = items.find(
      (i) => i.styleId === style.id && i.sizeCode && normalizeCode(i.sizeCode) === normalizedShorthand,
    );
    if (bySize) {
      return { catalogItemId: bySize.id, method: "EXACT", confidence: 0.97, candidates: [candidateFrom(bySize, 0.97)] };
    }
  }

  return null;
}
