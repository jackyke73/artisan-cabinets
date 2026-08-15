import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatCents } from "@/lib/money";
import { Badge } from "@/components/ui/badge";
import { qboConnected } from "@/lib/qbo/client";
import { PushToQuickBooksButton } from "@/components/quote/PushToQuickBooksButton";

export const dynamic = "force-dynamic";

export default async function QuoteView({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const quote = await db.quote.findUnique({
    where: { id },
    include: {
      customer: true,
      style: true,
      lineItems: { orderBy: { lineNumber: "asc" }, include: { catalogItem: true } },
    },
  });
  if (!quote) notFound();

  const connected = await qboConnected();

  const statusVariant =
    quote.status === "CONFIRMED" || quote.status === "EXPORTED" ? "green" : quote.status === "NEEDS_REVIEW" ? "yellow" : "gray";

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold">{quote.quoteNumber}</h1>
          <Badge variant={statusVariant}>{quote.status}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <PushToQuickBooksButton quoteId={quote.id} connected={connected} qboEstimateId={quote.qboEstimateId} />
          <a
            href={`/quotes/${quote.id}/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700"
          >
            Export PDF
          </a>
          <Link href="/quotes/new" className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted">
            New quote
          </Link>
        </div>
      </div>

      <div className="text-sm text-muted-foreground">
        {quote.customer?.name ?? "No customer"}
        {quote.style ? ` · Style ${quote.style.code} (${quote.style.name})` : ""}
      </div>

      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left">
            <tr>
              <th className="px-3 py-2">#</th>
              <th className="px-3 py-2">Request</th>
              <th className="px-3 py-2">SKU</th>
              <th className="px-3 py-2">Description</th>
              <th className="px-3 py-2 text-right">Qty</th>
              <th className="px-3 py-2 text-right">Unit</th>
              <th className="px-3 py-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {quote.lineItems.map((li) => (
              <tr key={li.id} className={li.catalogItemId ? "" : "bg-red-50/40"}>
                <td className="px-3 py-1.5">{li.lineNumber}</td>
                <td className="px-3 py-1.5 font-mono">{li.rawText}</td>
                <td className="px-3 py-1.5 font-mono">{li.catalogItem?.sku ?? "—"}</td>
                <td className="px-3 py-1.5">{li.descriptionSnapshot || "—"}</td>
                <td className="px-3 py-1.5 text-right">{li.quantity}</td>
                <td className="px-3 py-1.5 text-right">{formatCents(li.unitPriceCents)}</td>
                <td className="px-3 py-1.5 text-right">{formatCents(li.lineTotalCents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="ml-auto w-64 space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Subtotal</span>
          <span>{formatCents(quote.subtotalCents)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Tax</span>
          <span>{formatCents(quote.taxCents)}</span>
        </div>
        <div className="flex justify-between border-t border-border pt-1 font-semibold">
          <span>Total</span>
          <span>{formatCents(quote.totalCents)}</span>
        </div>
      </div>
    </div>
  );
}
