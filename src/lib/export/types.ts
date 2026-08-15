/** Shared shape used by every export target (PDF today, QuickBooks in Phase 3). */
export interface ExportableLine {
  lineNumber: number;
  sku: string | null;
  description: string;
  quantity: number;
  unitPriceCents: number;
  lineTotalCents: number;
}

export interface ExportableQuote {
  quoteNumber: string;
  customerName: string | null;
  styleLabel: string | null;
  createdAt: Date;
  lineItems: ExportableLine[];
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
}

/** The seam: PDF is implemented now; exportToQuickBooks arrives in Phase 3. */
export interface ExportTarget {
  exportPdf(quote: ExportableQuote): Promise<Buffer>;
}
