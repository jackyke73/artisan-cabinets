import { describe, expect, it } from "vitest";
import { applyPicks, selectAmbiguous } from "./llm";
import type { MatchedLine } from "./types";

function line(partial: Partial<MatchedLine>): MatchedLine {
  return {
    lineNumber: 1,
    rawText: "B15",
    shorthand: "B15",
    quantity: 1,
    catalogItemId: null,
    method: "FUZZY",
    confidence: 0.5,
    status: "NEEDS_REVIEW",
    candidates: [
      { catalogItemId: "i_b15", sku: "AWB-B15", description: "Base 15", priceCents: 12630, score: 0.5 },
      { catalogItemId: "i_b18", sku: "AWB-B18", description: "Base 18", priceCents: 12920, score: 0.4 },
    ],
    ...partial,
  };
}

describe("selectAmbiguous", () => {
  it("selects low-confidence lines that have candidates", () => {
    const lines = [
      line({ lineNumber: 1, confidence: 0.5 }),
      line({ lineNumber: 2, confidence: 0.98, method: "EXACT" }), // confident — skip
      line({ lineNumber: 3, confidence: 0.4, candidates: [] }), // no candidates — skip
    ];
    expect(selectAmbiguous(lines).map((l) => l.lineNumber)).toEqual([1]);
  });
});

describe("applyPicks", () => {
  it("binds a valid candidate the model chose, capping confidence and marking LLM", () => {
    const [out] = applyPicks([line({ lineNumber: 1 })], [{ id: 1, sku: "AWB-B18", confidence: 0.97 }]);
    expect(out.catalogItemId).toBe("i_b18");
    expect(out.method).toBe("LLM");
    expect(out.confidence).toBe(0.9); // capped below EXACT
  });

  it("ignores a hallucinated SKU not in the candidate list", () => {
    const input = line({ lineNumber: 1, catalogItemId: "i_b15", confidence: 0.5 });
    const [out] = applyPicks([input], [{ id: 1, sku: "FAKE-999", confidence: 0.99 }]);
    expect(out.catalogItemId).toBe("i_b15"); // unchanged
    expect(out.method).toBe("FUZZY");
  });

  it("unbinds the line when the model returns null", () => {
    const [out] = applyPicks([line({ lineNumber: 1, catalogItemId: "i_b15" })], [{ id: 1, sku: null, confidence: 0 }]);
    expect(out.catalogItemId).toBeNull();
    expect(out.method).toBe("UNMATCHED");
  });

  it("leaves lines with no pick untouched", () => {
    const input = line({ lineNumber: 2, catalogItemId: "i_b15", method: "EXACT", confidence: 0.98 });
    const [out] = applyPicks([input], []);
    expect(out).toEqual(input);
  });
});
