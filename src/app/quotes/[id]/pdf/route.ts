import { db } from "@/lib/db";
import { renderQuotePdf } from "@/lib/export/pdf";
import type { ExportableQuote } from "@/lib/export/types";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const quote = await db.quote.findUnique({
    where: { id },
    include: {
      customer: true,
      style: true,
      lineItems: { orderBy: { lineNumber: "asc" }, include: { catalogItem: true } },
    },
  });
  if (!quote) return new Response("Not found", { status: 404 });

  const data: ExportableQuote = {
    quoteNumber: quote.quoteNumber,
    customerName: quote.customer?.name ?? null,
    styleLabel: quote.style ? `${quote.style.code} — ${quote.style.name}` : null,
    createdAt: quote.createdAt,
    lineItems: quote.lineItems.map((li) => ({
      lineNumber: li.lineNumber,
      sku: li.catalogItem?.sku ?? null,
      description: li.descriptionSnapshot,
      quantity: li.quantity,
      unitPriceCents: li.unitPriceCents,
      lineTotalCents: li.lineTotalCents,
    })),
    subtotalCents: quote.subtotalCents,
    taxCents: quote.taxCents,
    totalCents: quote.totalCents,
  };

  const pdf = await renderQuotePdf(data);
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${quote.quoteNumber}.pdf"`,
    },
  });
}
