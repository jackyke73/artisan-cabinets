"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { matchRequest, writeBackAlias, type MatchedLine } from "@/lib/matching";

/** Parse a pasted request and run the matching pipeline. Called from the builder. */
export async function runMatch(rawInput: string, styleId: string | null): Promise<MatchedLine[]> {
  if (!rawInput.trim()) return [];
  return matchRequest(rawInput, styleId);
}

export interface SaveLineInput {
  lineNumber: number;
  rawText: string;
  parsedShorthand: string;
  quantity: number;
  catalogItemId: string | null;
  method: string;
  confidence: number;
}

export interface SaveQuoteInput {
  styleId: string | null;
  customerName: string | null;
  rawInput: string;
  taxRatePct: number;
  confirm: boolean;
  lines: SaveLineInput[];
}

export interface SaveQuoteResult {
  quoteId: string;
  quoteNumber: string;
  status: string;
}

async function nextQuoteNumber(): Promise<string> {
  const count = await db.quote.count();
  return `Q-${String(count + 1).padStart(4, "0")}`;
}

/** Persist a quote with snapshotted line items; teach aliases on confirm. */
export async function saveQuote(input: SaveQuoteInput): Promise<SaveQuoteResult> {
  const itemIds = input.lines.map((l) => l.catalogItemId).filter((id): id is string => !!id);
  const items = await db.catalogItem.findMany({ where: { id: { in: itemIds } } });
  const itemById = new Map(items.map((i) => [i.id, i]));

  const hasUnmatched = input.lines.some((l) => !l.catalogItemId);
  const status = input.confirm ? (hasUnmatched ? "NEEDS_REVIEW" : "CONFIRMED") : "DRAFT";

  let subtotalCents = 0;
  const lineData = input.lines.map((l) => {
    const item = l.catalogItemId ? itemById.get(l.catalogItemId) : undefined;
    const unitPriceCents = item?.priceCents ?? 0;
    const lineTotalCents = unitPriceCents * l.quantity;
    subtotalCents += lineTotalCents;
    return {
      lineNumber: l.lineNumber,
      rawText: l.rawText,
      parsedShorthand: l.parsedShorthand,
      quantity: l.quantity,
      catalogItemId: item?.id ?? null,
      matchMethod: item ? l.method : "UNMATCHED",
      confidence: l.confidence,
      status: item ? (l.confidence >= 0.9 ? "AUTO_ACCEPTED" : "NEEDS_REVIEW") : "NEEDS_REVIEW",
      descriptionSnapshot: item?.description ?? "",
      unitPriceCents,
      lineTotalCents,
      candidatesJson: "[]",
    };
  });

  const taxCents = Math.round((subtotalCents * input.taxRatePct) / 100);
  const totalCents = subtotalCents + taxCents;
  const quoteNumber = await nextQuoteNumber();

  // Reuse an existing customer with the same name instead of creating duplicates.
  let customerId: string | null = null;
  const name = input.customerName?.trim();
  if (name) {
    const existing = await db.customer.findFirst({ where: { name } });
    customerId = existing?.id ?? (await db.customer.create({ data: { name } })).id;
  }

  const quote = await db.quote.create({
    data: {
      quoteNumber,
      customerId,
      styleId: input.styleId,
      status,
      rawInput: input.rawInput,
      subtotalCents,
      taxCents,
      totalCents,
      lineItems: { create: lineData },
    },
  });

  // Teach the alias table from every confirmed, matched line (the moat).
  if (status === "CONFIRMED") {
    for (const l of input.lines) {
      if (l.catalogItemId && l.parsedShorthand) {
        await writeBackAlias(l.parsedShorthand, l.catalogItemId, input.styleId);
      }
    }
  }

  revalidatePath("/");
  return { quoteId: quote.id, quoteNumber, status };
}
