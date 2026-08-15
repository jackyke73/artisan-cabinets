import Link from "next/link";
import { db } from "@/lib/db";
import { QuoteBuilder } from "@/components/quote/QuoteBuilder";

export const dynamic = "force-dynamic";

export default async function NewQuotePage() {
  const [styles, catalog, customers] = await Promise.all([
    db.style.findMany({ where: { active: true }, orderBy: { code: "asc" }, select: { id: true, code: true, name: true } }),
    db.catalogItem.findMany({
      where: { active: true },
      orderBy: { sku: "asc" },
      select: { id: true, sku: true, description: true, priceCents: true, styleId: true, sizeCode: true },
    }),
    db.customer.findMany({ orderBy: { name: "asc" }, take: 500, select: { name: true } }),
  ]);

  if (catalog.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border p-8 text-center">
        <p className="text-muted-foreground">
          Your catalog is empty. {" "}
          <Link href="/catalog/import" className="underline">
            Import your price list
          </Link>{" "}
          before building a quote.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">New quote</h1>
      <QuoteBuilder styles={styles} catalog={catalog} customers={customers.map((c) => c.name)} />
    </div>
  );
}
