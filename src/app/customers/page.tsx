import Link from "next/link";
import { db } from "@/lib/db";
import { formatCents } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();

  const customers = await db.customer.findMany({
    where: query ? { name: { contains: query } } : {},
    orderBy: { name: "asc" },
    take: 300,
    include: {
      quotes: { select: { totalCents: true } },
      _count: { select: { quotes: true } },
    },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Customers ({customers.length})</h1>

      <form className="flex gap-2">
        <input
          name="q"
          defaultValue={query}
          placeholder="Search customers…"
          className="w-72 rounded-md border border-border px-3 py-1.5 text-sm"
        />
        <button className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted">Search</button>
      </form>

      {customers.length === 0 ? (
        <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          No customers yet — they&apos;re created automatically when you save a quote with a customer name.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted text-left">
              <tr>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Company</th>
                <th className="px-3 py-2 text-right">Quotes</th>
                <th className="px-3 py-2 text-right">Total quoted</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {customers.map((c) => {
                const total = c.quotes.reduce((s, q) => s + q.totalCents, 0);
                return (
                  <tr key={c.id} className="hover:bg-muted">
                    <td className="px-3 py-1.5 font-medium">{c.name}</td>
                    <td className="px-3 py-1.5 text-muted-foreground">{c.company ?? "—"}</td>
                    <td className="px-3 py-1.5 text-right">
                      <Link href={`/quotes?q=${encodeURIComponent(c.name)}`} className="hover:underline">
                        {c._count.quotes}
                      </Link>
                    </td>
                    <td className="px-3 py-1.5 text-right">{formatCents(total)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
