import { db } from "@/lib/db";
import { createEstimate, findOrCreateCustomer, findOrCreateItem, getIncomeAccountId, type EstimateLineInput } from "./client";

const toDollars = (cents: number) => Number((cents / 100).toFixed(2));

export interface PushResult {
  estimateId: string;
}

/**
 * Push a saved quote to QuickBooks Online as an Estimate. Matches (or creates)
 * the customer and each line item, persisting the QBO ids so re-pushes and
 * future quotes reuse them. Requires a fully-matched quote with a customer.
 */
export async function pushQuoteToQuickBooks(quoteId: string): Promise<PushResult> {
  const quote = await db.quote.findUnique({
    where: { id: quoteId },
    include: { customer: true, lineItems: { orderBy: { lineNumber: "asc" }, include: { catalogItem: true } } },
  });
  if (!quote) throw new Error("Quote not found.");
  if (quote.lineItems.length === 0) throw new Error("This quote has no line items.");
  if (!quote.customer) throw new Error("Add a customer to the quote before pushing to QuickBooks.");
  const unmatched = quote.lineItems.filter((l) => !l.catalogItemId || !l.catalogItem);
  if (unmatched.length > 0) {
    throw new Error(`Resolve all line items first — ${unmatched.length} still has no matched SKU.`);
  }

  // Customer (reuse mapping if we have it).
  let customerQboId = quote.customer.qboCustomerId;
  if (!customerQboId) {
    customerQboId = await findOrCreateCustomer(quote.customer.name);
    await db.customer.update({ where: { id: quote.customer.id }, data: { qboCustomerId: customerQboId } });
  }

  // Items — resolve each distinct catalog item once.
  const incomeAccountId = await getIncomeAccountId();
  const itemQboIdByCatalogId = new Map<string, string>();
  for (const line of quote.lineItems) {
    const item = line.catalogItem!;
    if (itemQboIdByCatalogId.has(item.id)) continue;
    let itemQboId = item.qboItemId;
    if (!itemQboId) {
      itemQboId = await findOrCreateItem(item.sku, line.descriptionSnapshot || item.description, toDollars(item.priceCents), incomeAccountId);
      await db.catalogItem.update({ where: { id: item.id }, data: { qboItemId: itemQboId } });
    }
    itemQboIdByCatalogId.set(item.id, itemQboId);
  }

  const lines: EstimateLineInput[] = quote.lineItems.map((l) => ({
    itemId: itemQboIdByCatalogId.get(l.catalogItem!.id)!,
    description: l.descriptionSnapshot || l.catalogItem!.description,
    quantity: l.quantity,
    unitPriceDollars: toDollars(l.unitPriceCents),
    amountDollars: toDollars(l.lineTotalCents),
  }));

  const estimateId = await createEstimate(customerQboId, lines);

  await db.quote.update({ where: { id: quote.id }, data: { qboEstimateId: estimateId, status: "EXPORTED" } });
  return { estimateId };
}
