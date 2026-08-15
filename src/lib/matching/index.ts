import { db } from "@/lib/db";
import { lookupAlias } from "./alias";
import { matchDeterministic } from "./core";
import { parseRequest } from "./parser";
import { statusForConfidence } from "./confidence";
import { refineLinesWithLLM } from "./llm";
import type { CatalogItemLite, MatchedLine, MatchResult, StyleLite } from "./types";

export { parseRequest } from "./parser";
export { writeBackAlias } from "./alias";
export { isLlmEnabled } from "./llm";
export * from "./types";

/** Load the active catalog (in memory) for a matching run. */
export async function loadCatalog(): Promise<CatalogItemLite[]> {
  const items = await db.catalogItem.findMany({
    where: { active: true },
    select: {
      id: true,
      sku: true,
      normalizedSku: true,
      description: true,
      priceCents: true,
      category: true,
      sizeCode: true,
      styleId: true,
    },
  });
  return items;
}

async function loadStyle(styleId: string | null): Promise<StyleLite | null> {
  if (!styleId) return null;
  const style = await db.style.findUnique({
    where: { id: styleId },
    select: { id: true, code: true, name: true },
  });
  return style;
}

/** Full pipeline for a single shorthand: alias (Stage 1) then deterministic (2–3). */
export async function matchShorthand(
  rawShorthand: string,
  styleId: string | null,
  items: CatalogItemLite[],
  style: StyleLite | null,
): Promise<MatchResult> {
  const alias = await lookupAlias(rawShorthand, styleId);
  if (alias) return alias;
  return matchDeterministic(rawShorthand, items, style);
}

/** Parse a pasted request and match every line. Loads catalog + style once. */
export async function matchRequest(
  rawInput: string,
  styleId: string | null,
): Promise<MatchedLine[]> {
  const [items, style] = await Promise.all([loadCatalog(), loadStyle(styleId)]);
  const parsed = parseRequest(rawInput);

  const results: MatchedLine[] = [];
  for (let i = 0; i < parsed.length; i++) {
    const line = parsed[i];
    const match = await matchShorthand(line.shorthand, styleId, items, style);

    // Alias/exact bind directly. Fuzzy doesn't bind, but we pre-select its top
    // candidate so the row shows a proposed SKU for the reviewer to accept or change.
    let catalogItemId = match.catalogItemId;
    if (!catalogItemId && match.method === "FUZZY" && match.candidates.length > 0) {
      catalogItemId = match.candidates[0].catalogItemId;
    }
    const bound = catalogItemId !== null;

    results.push({
      lineNumber: i + 1,
      rawText: line.rawText,
      shorthand: line.shorthand,
      quantity: line.quantity,
      catalogItemId,
      method: bound ? match.method : "UNMATCHED",
      confidence: match.confidence,
      status: bound ? statusForConfidence(match.confidence) : "NEEDS_REVIEW",
      candidates: match.candidates,
    });
  }

  // Stage 5: let the LLM resolve the genuinely ambiguous residue (no-op when
  // no API key is configured; fails safe to the deterministic result).
  return refineLinesWithLLM(results, style?.name ?? null);
}
