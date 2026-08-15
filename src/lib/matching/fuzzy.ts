import Fuse from "fuse.js";
import { stringSimilarity } from "string-similarity-js";
import { normalizeCode } from "./normalize";
import type { Candidate, CatalogItemLite, MatchResult, StyleLite } from "./types";

const TOP_N = 5;

/**
 * Stage 3 — fuzzy / trigram match. Deterministic and pure.
 * Primary signal is code-token similarity (Dice bigram) against each item's
 * normalized SKU and size code; a Fuse.js description search widens the pool
 * when no code is close. Candidates are scoped to the chosen style first and
 * only widened to the whole catalog if nothing plausible turns up there.
 */
export function fuzzyMatch(
  normalizedShorthand: string,
  items: CatalogItemLite[],
  style: StyleLite | null,
): MatchResult {
  const scored = scorePool(normalizedShorthand, scopePool(items, style));

  // If the style-scoped pool produced nothing decent, widen to the full catalog.
  let best = scored;
  if (style && (best.length === 0 || best[0].score < 0.45)) {
    const widened = scorePool(normalizedShorthand, items);
    if (widened.length && (best.length === 0 || widened[0].score > best[0].score)) {
      best = widened;
    }
  }

  const candidates = best.slice(0, TOP_N);
  const top = candidates[0];
  return {
    catalogItemId: null, // fuzzy never auto-binds; the UI confirms from candidates
    method: "FUZZY",
    confidence: top ? top.score : 0,
    candidates,
  };
}

function scopePool(items: CatalogItemLite[], style: StyleLite | null): CatalogItemLite[] {
  if (!style) return items;
  const scoped = items.filter((i) => i.styleId === style.id);
  return scoped.length ? scoped : items;
}

function scorePool(normShort: string, pool: CatalogItemLite[]): Candidate[] {
  const codeScored = pool.map((item) => {
    const skuScore = stringSimilarity(normShort, item.normalizedSku);
    const sizeScore = item.sizeCode ? stringSimilarity(normShort, normalizeCode(item.sizeCode)) : 0;
    return { item, score: Math.max(skuScore, sizeScore) };
  });

  // Description fallback via Fuse when nothing scores well on the code.
  const bestCode = codeScored.reduce((m, c) => Math.max(m, c.score), 0);
  if (bestCode < 0.4 && normShort.length >= 3) {
    const fuse = new Fuse(pool, {
      keys: ["description", "sku"],
      includeScore: true,
      ignoreLocation: true,
      threshold: 0.5,
    });
    for (const r of fuse.search(normShort)) {
      const descScore = r.score !== undefined ? (1 - r.score) * 0.6 : 0;
      const entry = codeScored.find((c) => c.item.id === r.item.id);
      if (entry) entry.score = Math.max(entry.score, descScore);
    }
  }

  return codeScored
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((c) => ({
      catalogItemId: c.item.id,
      sku: c.item.sku,
      description: c.item.description,
      priceCents: c.item.priceCents,
      score: Number(c.score.toFixed(3)),
    }));
}
