import { db } from "@/lib/db";
import { aliasConfidence } from "./confidence";
import { normalizeCode } from "./normalize";
import type { MatchResult } from "./types";

/**
 * Stage 1 — alias lookup. Prefers an alias scoped to the chosen style, falling
 * back to a global (styleId = null) alias. This is the highest-priority stage
 * and the reason the tool gets smarter over time.
 */
export async function lookupAlias(
  rawShorthand: string,
  styleId: string | null,
): Promise<MatchResult | null> {
  const norm = normalizeCode(rawShorthand);
  if (!norm) return null;

  const orClauses: { styleId: string | null }[] = [{ styleId: null }];
  if (styleId) orClauses.unshift({ styleId });

  const aliases = await db.alias.findMany({
    where: { normalizedShorthand: norm, OR: orClauses },
    include: { catalogItem: true },
    orderBy: [{ confirmCount: "desc" }],
  });
  if (aliases.length === 0) return null;

  const chosen =
    aliases.find((a) => a.styleId === styleId) ??
    aliases.find((a) => a.styleId === null) ??
    aliases[0];
  if (!chosen?.catalogItem || !chosen.catalogItem.active) return null;

  const item = chosen.catalogItem;
  const confidence = aliasConfidence(chosen.confirmCount);
  return {
    catalogItemId: item.id,
    method: "ALIAS",
    confidence,
    candidates: [
      {
        catalogItemId: item.id,
        sku: item.sku,
        description: item.description,
        priceCents: item.priceCents,
        score: confidence,
      },
    ],
  };
}

/**
 * The write-back (the moat). When staff confirm or correct a line, remember the
 * shorthand -> SKU mapping so Stage 1 resolves it instantly next time. Re-confirming
 * the same mapping bumps confirmCount (raising its confidence).
 */
export async function writeBackAlias(
  rawShorthand: string,
  catalogItemId: string,
  styleId: string | null,
  source = "MANUAL_CONFIRM",
): Promise<void> {
  const norm = normalizeCode(rawShorthand);
  if (!norm) return;

  const existing = await db.alias.findFirst({
    where: { normalizedShorthand: norm, styleId: styleId ?? null },
  });

  if (existing) {
    const sameTarget = existing.catalogItemId === catalogItemId;
    await db.alias.update({
      where: { id: existing.id },
      data: {
        catalogItemId,
        shorthand: rawShorthand,
        // Reconfirming the same mapping strengthens it; a correction to a new
        // target resets the count to 1.
        confirmCount: sameTarget ? existing.confirmCount + 1 : 1,
        lastUsedAt: new Date(),
      },
    });
  } else {
    await db.alias.create({
      data: {
        shorthand: rawShorthand,
        normalizedShorthand: norm,
        catalogItemId,
        styleId: styleId ?? null,
        source,
      },
    });
  }
}
