import Link from "next/link";
import { db } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { formatCents } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const [catalogCount, aliasCount, styleCount, quotes] = await Promise.all([
    db.catalogItem.count({ where: { active: true } }),
    db.alias.count(),
    db.style.count({ where: { active: true } }),
    db.quote.findMany({
      orderBy: { updatedAt: "desc" },
      take: 10,
      include: { customer: true, style: true },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <Link
          href="/quotes/new"
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
        >
          + New Quote
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Stat label="Catalog items" value={catalogCount} href="/catalog" />
        <Stat label="Learned aliases" value={aliasCount} hint="mappings the tool remembers" />
        <Stat label="Door styles" value={styleCount} />
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-muted-foreground">Recent quotes</h2>
        {quotes.length === 0 ? (
          <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No quotes yet.{" "}
            {catalogCount === 0 ? (
              <>
                First,{" "}
                <Link href="/catalog/import" className="underline">
                  import your catalog
                </Link>
                .
              </>
            ) : (
              <>
                Start a{" "}
                <Link href="/quotes/new" className="underline">
                  new quote
                </Link>
                .
              </>
            )}
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-md border border-border">
            {quotes.map((q) => (
              <li key={q.id}>
                <Link href={`/quotes/${q.id}`} className="flex items-center justify-between px-4 py-3 hover:bg-muted">
                  <div>
                    <span className="font-medium">{q.quoteNumber}</span>
                    <span className="ml-2 text-sm text-muted-foreground">
                      {q.customer?.name ?? "No customer"}
                      {q.style ? ` · ${q.style.code}` : ""}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm">{formatCents(q.totalCents)}</span>
                    <StatusBadge status={q.status} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, hint, href }: { label: string; value: number; hint?: string; href?: string }) {
  const inner = (
    <div className="rounded-md border border-border bg-white p-4">
      <div className="text-2xl font-semibold">{value}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

function StatusBadge({ status }: { status: string }) {
  const variant = status === "CONFIRMED" || status === "EXPORTED" ? "green" : status === "NEEDS_REVIEW" ? "yellow" : "gray";
  return <Badge variant={variant}>{status}</Badge>;
}
