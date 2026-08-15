import { PrismaClient } from "@prisma/client";
import { normalizeCode } from "../src/lib/matching/normalize";

const db = new PrismaClient();

// Three door styles (the "line" prefix concept).
const STYLES = [
  { code: "BPS", name: "Painted Shaker White" },
  { code: "NOB", name: "Natural Oak Base" },
  { code: "CHY", name: "Cherry Raised Panel" },
];

// Size codes shared across styles: letter = cabinet type, number = width (in).
// B = Base, W = Wall, T = Tall, D = Drawer base.
const SIZES: { sizeCode: string; description: string; category: string; priceUsd: number }[] = [
  { sizeCode: "B12", description: 'Base Cabinet 12"', category: "Base", priceUsd: 128 },
  { sizeCode: "B15", description: 'Base Cabinet 15"', category: "Base", priceUsd: 142 },
  { sizeCode: "B18", description: 'Base Cabinet 18"', category: "Base", priceUsd: 156 },
  { sizeCode: "B24", description: 'Base Cabinet 24"', category: "Base", priceUsd: 188 },
  { sizeCode: "B30", description: 'Base Cabinet 30"', category: "Base", priceUsd: 214 },
  { sizeCode: "B36", description: 'Base Cabinet 36"', category: "Base", priceUsd: 246 },
  { sizeCode: "D18", description: 'Drawer Base 18" (3 drawer)', category: "Base", priceUsd: 232 },
  { sizeCode: "D24", description: 'Drawer Base 24" (3 drawer)', category: "Base", priceUsd: 268 },
  { sizeCode: "W1230", description: 'Wall Cabinet 12"x30"', category: "Wall", priceUsd: 96 },
  { sizeCode: "W1530", description: 'Wall Cabinet 15"x30"', category: "Wall", priceUsd: 108 },
  { sizeCode: "W1830", description: 'Wall Cabinet 18"x30"', category: "Wall", priceUsd: 124 },
  { sizeCode: "W2430", description: 'Wall Cabinet 24"x30"', category: "Wall", priceUsd: 152 },
  { sizeCode: "W3030", description: 'Wall Cabinet 30"x30"', category: "Wall", priceUsd: 168 },
  { sizeCode: "W3630", description: 'Wall Cabinet 36"x30"', category: "Wall", priceUsd: 194 },
  { sizeCode: "T2484", description: 'Tall Pantry 24"x84"', category: "Tall", priceUsd: 372 },
  { sizeCode: "T3084", description: 'Tall Pantry 30"x84"', category: "Tall", priceUsd: 418 },
  // A style-specific accent size that only exists in BPS in some catalogs.
  { sizeCode: "A15", description: 'Angle Corner 15"', category: "Base", priceUsd: 176 },
];

async function main() {
  console.log("Seeding…");
  await db.quoteLineItem.deleteMany();
  await db.quote.deleteMany();
  await db.alias.deleteMany();
  await db.catalogItem.deleteMany();
  await db.style.deleteMany();
  await db.customer.deleteMany();
  await db.importBatch.deleteMany();

  const batch = await db.importBatch.create({
    data: { filename: "seed-catalog", rowCount: STYLES.length * SIZES.length, importedCount: 0, status: "COMPLETED" },
  });

  let imported = 0;
  for (const s of STYLES) {
    const style = await db.style.create({ data: { code: s.code, name: s.name } });
    // Cherry doesn't carry the angle-corner accent, to exercise per-style scoping.
    const sizes = s.code === "CHY" ? SIZES.filter((z) => z.sizeCode !== "A15") : SIZES;
    for (const z of sizes) {
      const sku = `${s.code}-${z.sizeCode}`;
      await db.catalogItem.create({
        data: {
          sku,
          normalizedSku: normalizeCode(sku),
          description: `${s.name} — ${z.description}`,
          priceCents: Math.round(z.priceUsd * 100),
          category: z.category,
          sizeCode: z.sizeCode,
          unit: "EA",
          styleId: style.id,
          importBatchId: batch.id,
        },
      });
      imported++;
    }
  }
  await db.importBatch.update({ where: { id: batch.id }, data: { importedCount: imported } });

  await db.customer.create({
    data: { name: "Maple Street Kitchens", email: "orders@maplestreet.example", company: "Maple Street Kitchens LLC" },
  });

  console.log(`Seeded ${STYLES.length} styles, ${imported} catalog items.`);
}

main()
  .then(() => db.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await db.$disconnect();
    process.exit(1);
  });
