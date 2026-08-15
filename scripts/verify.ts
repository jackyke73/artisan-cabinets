// Runtime regression check for the DB-backed matching pipeline against the
// seeded catalog. Run with: npm run verify (after npm run db:seed).
// PDF rendering is verified through the running app (GET /quotes/[id]/pdf),
// not here — @react-pdf's JSX needs Next's automatic runtime.
import { db } from "@/lib/db";
import { matchRequest, writeBackAlias } from "@/lib/matching";
import { lookupAlias } from "@/lib/matching/alias";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error("FAIL: " + msg);
  console.log("  ok:", msg);
}

async function main() {
  const bps = await db.style.findUnique({ where: { code: "BPS" } });
  if (!bps) throw new Error("Seed missing BPS style — run npm run db:seed");

  console.log("1) Matching a pasted request against the seeded catalog (style BPS):");
  const lines = await matchRequest("B15 x2\nW3030\n3 B18\nA15 (4)\nZZ99", bps.id);
  for (const l of lines) {
    const item = l.catalogItemId ? await db.catalogItem.findUnique({ where: { id: l.catalogItemId } }) : null;
    console.log(`   "${l.rawText}" -> ${item?.sku ?? "UNMATCHED"} (${l.method}, ${Math.round(l.confidence * 100)}%, qty ${l.quantity})`);
  }
  const bySku = new Map(
    await Promise.all(
      lines.map(async (l) => [l.rawText, l.catalogItemId ? (await db.catalogItem.findUnique({ where: { id: l.catalogItemId } }))?.sku : null] as const),
    ),
  );
  assert(bySku.get("B15 x2") === "BPS-B15", "B15 under BPS resolves to BPS-B15");
  assert(bySku.get("W3030") === "BPS-W3030", "W3030 resolves to BPS-W3030");
  assert(bySku.get("3 B18") === "BPS-B18", "B18 resolves to BPS-B18");
  assert(bySku.get("A15 (4)") === "BPS-A15", "A15 resolves to BPS-A15");
  assert(lines.find((l) => l.rawText === "A15 (4)")?.quantity === 4, "quantity parsed for A15 (4) -> 4");
  assert(lines.find((l) => l.rawText.startsWith("ZZ99"))?.catalogItemId == null, "ZZ99 stays UNMATCHED (no silent wrong guess)");

  console.log("2) Alias write-back (the moat):");
  const target = await db.catalogItem.findFirst({ where: { sku: "BPS-B24" } });
  if (!target) throw new Error("Missing BPS-B24");
  await writeBackAlias("BB", target.id, bps.id); // a shorthand the deterministic stages would not resolve
  const aliasHit = await lookupAlias("BB", bps.id);
  assert(aliasHit?.catalogItemId === target.id, "after write-back, 'BB' resolves via alias to BPS-B24");
  assert(aliasHit!.method === "ALIAS" && aliasHit!.confidence >= 0.9, "alias hit is high-confidence");
  await db.alias.deleteMany({ where: { normalizedShorthand: "BB" } }); // cleanup

  console.log("\nALL VERIFICATIONS PASSED");
}

main()
  .then(() => db.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await db.$disconnect();
    process.exit(1);
  });
