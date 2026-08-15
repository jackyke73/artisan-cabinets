import type { ExportableQuote } from "./types";

/**
 * Phase 3 seam — push a quote to QuickBooks Online as an Estimate.
 *
 * QuickBooks Online exposes a REST API secured with OAuth 2.0. A quote maps to
 * their `Estimate` object, whose `Line` entries reference `Item` records. To
 * wire this up later:
 *   1. Store per-company OAuth tokens (a `QuickBooksConnection` table).
 *   2. Add `qboItemId` to CatalogItem and `qboCustomerId`/`qboEstimateId` to
 *      Customer/Quote so mappings persist.
 *   3. Ensure the customer + items exist in QBO (create/find), build the
 *      Estimate payload from the snapshotted line items, POST it, store the id,
 *      and set the quote status to EXPORTED.
 *
 * The snapshotted QuoteLineItem rows already carry everything an Estimate needs.
 */
export async function exportToQuickBooks(_quote: ExportableQuote): Promise<never> {
  throw new Error("QuickBooks export is not implemented yet (planned for Phase 3).");
}
