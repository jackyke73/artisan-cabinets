import Link from "next/link";
import { db } from "@/lib/db";
import { formatCents } from "@/lib/money";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();

  const items = await db.catalogItem.findMany({
    where: {
      active: true,
      ...(query
        ? { OR: [{ sku: { contains: query } }, { description: { contains: query } }] }
        : {}),
    },
    include: { style: true },
    orderBy: [{ sku: "asc" }],
    take: 500,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Catalog ({items.length})</h1>
        <Link href="/catalog/import" className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted">
          Import
        </Link>
      </div>

      <form className="flex gap-2">
        <input
          name="q"
          defaultValue={query}
          placeholder="Search SKU or description…"
          className="w-72 rounded-md border border-border px-3 py-1.5 text-sm"
        />
        <button className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted">Search</button>
      </form>

      {items.length === 0 ? (
        <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          No catalog items.{" "}
          <Link href="/catalog/import" className="underline">
            Import your price list
          </Link>{" "}
          to get started.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted text-left">
              <tr>
                <th className="px-3 py-2">SKU</th>
                <th className="px-3 py-2">Description</th>
                <th className="px-3 py-2">Style</th>
                <th className="px-3 py-2">Size</th>
                <th className="px-3 py-2 text-right">Price</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((it) => (
                <tr key={it.id}>
                  <td className="px-3 py-1.5 font-mono">{it.sku}</td>
                  <td className="px-3 py-1.5">{it.description}</td>
                  <td className="px-3 py-1.5">
                    {it.style ? <Badge variant="gray">{it.style.code}</Badge> : "—"}
                  </td>
                  <td className="px-3 py-1.5 font-mono text-muted-foreground">{it.sizeCode ?? "—"}</td>
                  <td className="px-3 py-1.5 text-right">{formatCents(it.priceCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
