import Link from "next/link";
import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { formatCents } from "@/lib/money";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

const STATUSES = ["DRAFT", "NEEDS_REVIEW", "CONFIRMED", "EXPORTED"] as const;

export default async function QuotesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const { q, status } = await searchParams;
  const query = (q ?? "").trim();

  const where: Prisma.QuoteWhereInput = {};
  if (query) {
    where.OR = [
      { quoteNumber: { contains: query } },
      { customer: { name: { contains: query } } },
    ];
  }
  if (status && STATUSES.includes(status as (typeof STATUSES)[number])) {
    where.status = status;
  }

  const quotes = await db.quote.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    take: 200,
    include: { customer: true, style: true, _count: { select: { lineItems: true } } },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Quotes ({quotes.length})</h1>
        <Link href="/quotes/new" className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700">
          + New Quote
        </Link>
      </div>

      <form className="flex flex-wrap items-center gap-2">
        <input
          name="q"
          defaultValue={query}
          placeholder="Search quote # or customer…"
          className="w-72 rounded-md border border-border px-3 py-1.5 text-sm"
        />
        <select name="status" defaultValue={status ?? ""} className="rounded-md border border-border px-2 py-1.5 text-sm">
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <button className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted">Filter</button>
        {(query || status) && (
          <Link href="/quotes" className="text-sm text-muted-foreground underline">
            Clear
          </Link>
        )}
      </form>

      {quotes.length === 0 ? (
        <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          No quotes match.{" "}
          <Link href="/quotes/new" className="underline">
            Start a new quote
          </Link>
          .
        </p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted text-left">
              <tr>
                <th className="px-3 py-2">Quote</th>
                <th className="px-3 py-2">Customer</th>
                <th className="px-3 py-2">Style</th>
                <th className="px-3 py-2 text-right">Lines</th>
                <th className="px-3 py-2 text-right">Total</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {quotes.map((qte) => (
                <tr key={qte.id} className="hover:bg-muted">
                  <td className="px-3 py-1.5 font-medium">
                    <Link href={`/quotes/${qte.id}`} className="hover:underline">
                      {qte.quoteNumber}
                    </Link>
                  </td>
                  <td className="px-3 py-1.5">{qte.customer?.name ?? "—"}</td>
                  <td className="px-3 py-1.5">{qte.style ? <Badge variant="gray">{qte.style.code}</Badge> : "—"}</td>
                  <td className="px-3 py-1.5 text-right">{qte._count.lineItems}</td>
                  <td className="px-3 py-1.5 text-right">{formatCents(qte.totalCents)}</td>
                  <td className="px-3 py-1.5">
                    <StatusBadge status={qte.status} />
                  </td>
                  <td className="px-3 py-1.5 text-muted-foreground">{qte.updatedAt.toLocaleDateString("en-US")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const variant = status === "CONFIRMED" || status === "EXPORTED" ? "green" : status === "NEEDS_REVIEW" ? "yellow" : "gray";
  return <Badge variant={variant}>{status}</Badge>;
}
