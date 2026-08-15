import { describe, expect, it } from "vitest";
import { matchDeterministic } from "./core";
import { parseRequest } from "./parser";
import { normalizeCode, stripStylePrefix } from "./normalize";
import { aliasConfidence, statusForConfidence } from "./confidence";
import type { CatalogItemLite, StyleLite } from "./types";

const styleBPS: StyleLite = { id: "style_bps", code: "BPS", name: "Painted Shaker White" };
const styleNOB: StyleLite = { id: "style_nob", code: "NOB", name: "Natural Oak Base" };

function item(styleId: string, styleCode: string, sizeCode: string, priceCents: number): CatalogItemLite {
  const sku = `${styleCode}-${sizeCode}`;
  return {
    id: `${styleId}_${sizeCode}`,
    sku,
    normalizedSku: normalizeCode(sku),
    description: `${styleCode} ${sizeCode}`,
    priceCents,
    category: "Base",
    sizeCode,
    styleId,
  };
}

const catalog: CatalogItemLite[] = [
  item("style_bps", "BPS", "B15", 14200),
  item("style_bps", "BPS", "B18", 15600),
  item("style_bps", "BPS", "B24", 18800),
  item("style_bps", "BPS", "W3030", 16800),
  item("style_bps", "BPS", "A15", 17600),
  item("style_nob", "NOB", "B15", 13000),
  item("style_nob", "NOB", "W3030", 15000),
];

describe("normalize", () => {
  it("strips punctuation and uppercases", () => {
    expect(normalizeCode("bps-a15")).toBe("BPSA15");
    expect(normalizeCode(" B 15 ")).toBe("B15");
  });
  it("strips the style prefix when present", () => {
    expect(stripStylePrefix("BPSB15", "BPS")).toBe("B15");
    expect(stripStylePrefix("B15", "BPS")).toBe("B15");
  });
});

describe("parser", () => {
  it("extracts shorthand and quantity across formats", () => {
    const lines = parseRequest("B15 x2\nW3030\n3 B18, A15 (4)");
    expect(lines).toEqual([
      { rawText: "B15 x2", shorthand: "B15", quantity: 2 },
      { rawText: "W3030", shorthand: "W3030", quantity: 1 },
      { rawText: "3 B18", shorthand: "B18", quantity: 3 },
      { rawText: "A15 (4)", shorthand: "A15", quantity: 4 },
    ]);
  });
  it("drops segments with no recognizable code", () => {
    expect(parseRequest("please send a quote\nthanks")).toEqual([]);
  });
});

describe("exact matching (the core domain rule)", () => {
  it("resolves a size code within the chosen style: B15 under BPS -> BPS-B15", () => {
    const r = matchDeterministic("B15", catalog, styleBPS);
    expect(r.method).toBe("EXACT");
    expect(r.catalogItemId).toBe("style_bps_B15");
    expect(r.confidence).toBeGreaterThanOrEqual(0.9);
  });
  it("resolves the same shorthand to a different style's item when scoped there", () => {
    const r = matchDeterministic("B15", catalog, styleNOB);
    expect(r.catalogItemId).toBe("style_nob_B15");
  });
  it("resolves a full SKU regardless of chosen style", () => {
    const r = matchDeterministic("bps-a15", catalog, styleNOB);
    expect(r.method).toBe("EXACT");
    expect(r.catalogItemId).toBe("style_bps_A15");
  });
});

describe("fuzzy matching", () => {
  it("returns plausible candidates for a typo'd code, without auto-binding", () => {
    const r = matchDeterministic("B16", catalog, styleBPS);
    expect(r.method).toBe("FUZZY");
    expect(r.catalogItemId).toBeNull();
    expect(r.candidates.length).toBeGreaterThan(0);
    // Best candidates should be BPS base cabinets, not the wall or NOB items.
    expect(r.candidates[0].sku.startsWith("BPS-B")).toBe(true);
  });
  it("does not confidently match an unknown token", () => {
    const r = matchDeterministic("ZZ99", catalog, styleBPS);
    expect(r.confidence).toBeLessThan(0.6);
  });
});

describe("confidence gating", () => {
  it("gates by threshold", () => {
    expect(statusForConfidence(0.98)).toBe("AUTO_ACCEPTED");
    expect(statusForConfidence(0.75)).toBe("NEEDS_REVIEW");
    expect(statusForConfidence(0.3)).toBe("NEEDS_REVIEW");
  });
  it("alias confidence rises with confirmations and caps", () => {
    expect(aliasConfidence(1)).toBeCloseTo(0.91, 5);
    expect(aliasConfidence(1000)).toBe(0.99);
  });
});
