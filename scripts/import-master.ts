// Clean the real QuickBooks/Peachtree item-master export and load it into the app.
//   npm run import:master -- "<path to xlsx>" [priceLevel]
// Defaults: ~/Downloads/ITEM LIST revised.xlsx, price level 1.
// Also writes a tidy import-ready file to data/ITEM LIST (cleaned).xlsx.
import * as path from "node:path";
import * as os from "node:os";
import * as XLSX from "xlsx";
import { db } from "@/lib/db";
import { normalizeCode } from "@/lib/matching/normalize";

const srcPath = process.argv[2] || path.join(os.homedir(), "Downloads", "ITEM LIST revised.xlsx");
const priceLevel = Number(process.argv[3] || "1");

function parsePrice(v: string): number | null {
  const c = String(v).replace(/[$,\s]/g, "");
  if (c === "" || !isFinite(Number(c))) return null;
  return Number(c);
}

interface CleanItem {
  sku: string;
  description: string;
  priceCents: number;
  styleCode: string;
  sizeCode: string;
  category: string | null;
  styleName: string; // raw Item Description (pre majority-vote)
}

function main() {
  const wb = XLSX.readFile(srcPath);
  const rows = XLSX.utils.sheet_to_json<string[]>(wb.Sheets[wb.SheetNames[0]], {
    header: 1,
    raw: false,
    defval: "",
    blankrows: false,
  });
  const H = (rows[0] as string[]).map((h) => String(h).trim());
  const ix = (n: string) => H.indexOf(n);
  const iID = ix("Item ID");
  const iName = ix("Item Description");
  const iSales = ix("Description for Sales");
  const iClass = ix("Item Class");
  const iPrice = ix(`Price Level ${priceLevel}`);
  if (iID < 0 || iSales < 0 || iPrice < 0) {
    throw new Error(`Unexpected columns. Found headers: ${H.join(", ")}`);
  }

  const sellable = new Set(["Stock item", "Non-stock item"]);
  const dropped = { noDash: 0, notSellable: 0, marker: 0, noPrice: 0 };

  const items: CleanItem[] = [];
  for (const r of rows.slice(1) as string[][]) {
    const sku = String(r[iID]).trim();
    const nameRaw = String(r[iName]).trim();
    const lname = nameRaw.toLowerCase();
    if (lname === "category name" || lname === "product line name") { dropped.marker++; continue; }
    if (!sku.includes("-")) { dropped.noDash++; continue; }
    if (!sellable.has(String(r[iClass]).trim())) { dropped.notSellable++; continue; }
    const price = parsePrice(r[iPrice]);
    if (price === null || price <= 0) { dropped.noPrice++; continue; }

    const dash = sku.indexOf("-");
    const styleCode = sku.slice(0, dash);
    const sizeCode = sku.slice(dash + 1);
    const sales = String(r[iSales]).trim();
    const category = sales.split(/\s*\d/)[0].trim() || null; // leading words before first dimension digit

    items.push({
      sku,
      description: sales || nameRaw,
      priceCents: Math.round(price * 100),
      styleCode,
      sizeCode,
      category,
      styleName: nameRaw.replace(/\s+/g, " "),
    });
  }

  // Majority-vote a single display name per style code.
  const nameVotes = new Map<string, Map<string, number>>();
  for (const it of items) {
    const votes = nameVotes.get(it.styleCode) ?? new Map<string, number>();
    votes.set(it.styleName, (votes.get(it.styleName) ?? 0) + 1);
    nameVotes.set(it.styleCode, votes);
  }
  const styleNameByCode = new Map<string, string>();
  for (const [code, votes] of nameVotes) {
    const best = [...votes.entries()].sort((a, b) => b[1] - a[1])[0][0];
    styleNameByCode.set(code, best);
  }

  // --- Write the tidy, import-ready file ---
  const cleanRecords = items.map((it) => ({
    SKU: it.sku,
    Description: it.description,
    Price: (it.priceCents / 100).toFixed(2),
    "Style Code": it.styleCode,
    "Style Name": styleNameByCode.get(it.styleCode) ?? it.styleCode,
    "Size Code": it.sizeCode,
    Category: it.category ?? "",
  }));
  const outWb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(outWb, XLSX.utils.json_to_sheet(cleanRecords), "Catalog");
  const outPath = path.join(process.cwd(), "data", "ITEM LIST (cleaned).xlsx");
  XLSX.writeFile(outWb, outPath); // synchronous in the Node build of SheetJS

  return { items, styleNameByCode, dropped, outPath };
}

async function load(items: CleanItem[], styleNameByCode: Map<string, string>) {
  // Replace-mode load: clear existing quotes/aliases/catalog/styles, then insert.
  await db.quoteLineItem.deleteMany();
  await db.quote.deleteMany();
  await db.alias.deleteMany();
  await db.catalogItem.deleteMany();
  await db.style.deleteMany();

  const batch = await db.importBatch.create({
    data: { filename: path.basename(srcPath), rowCount: items.length, importedCount: items.length, status: "COMPLETED" },
  });

  const styleIdByCode = new Map<string, string>();
  for (const [code, name] of styleNameByCode) {
    const style = await db.style.create({ data: { code, name } });
    styleIdByCode.set(code, style.id);
  }

  const CHUNK = 500;
  for (let i = 0; i < items.length; i += CHUNK) {
    const slice = items.slice(i, i + CHUNK);
    await db.catalogItem.createMany({
      data: slice.map((it) => ({
        sku: it.sku,
        normalizedSku: normalizeCode(it.sku),
        description: it.description,
        priceCents: it.priceCents,
        category: it.category,
        sizeCode: it.sizeCode,
        unit: "EA",
        styleId: styleIdByCode.get(it.styleCode)!,
        importBatchId: batch.id,
      })),
    });
  }
}

async function run() {
  const { items, styleNameByCode, dropped, outPath } = main();
  console.log(`Source: ${srcPath}`);
  console.log(`Price column: Price Level ${priceLevel}`);
  console.log(`Cleaned file: ${outPath}`);
  console.log(`\nImportable SKUs: ${items.length} across ${styleNameByCode.size} styles`);
  console.log("Dropped rows:", dropped);
  await load(items, styleNameByCode);
  const [styleCount, itemCount] = await Promise.all([db.style.count(), db.catalogItem.count()]);
  console.log(`\nLoaded into app: ${styleCount} styles, ${itemCount} catalog items.`);
}

run()
  .then(() => db.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await db.$disconnect();
    process.exit(1);
  });
