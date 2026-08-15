export type MatchMethod =
  | "ALIAS"
  | "EXACT"
  | "FUZZY"
  | "LLM"
  | "MANUAL"
  | "UNMATCHED";

export type LineStatus =
  | "AUTO_ACCEPTED"
  | "NEEDS_REVIEW"
  | "CONFIRMED"
  | "REJECTED";

/** Minimal catalog shape the matching engine needs (decoupled from Prisma). */
export interface CatalogItemLite {
  id: string;
  sku: string;
  normalizedSku: string;
  description: string;
  priceCents: number;
  category: string | null;
  sizeCode: string | null;
  styleId: string | null;
}

export interface StyleLite {
  id: string;
  code: string;
  name: string;
}

export interface Candidate {
  catalogItemId: string;
  sku: string;
  description: string;
  priceCents: number;
  score: number; // 0..1
}

export interface MatchResult {
  catalogItemId: string | null;
  method: MatchMethod;
  confidence: number; // 0..1
  candidates: Candidate[];
}

/** A line item parsed out of the pasted customer request. */
export interface ParsedLine {
  rawText: string;
  shorthand: string;
  quantity: number;
}

/** A parsed line after matching — the shape the quote builder consumes. */
export interface MatchedLine {
  lineNumber: number;
  rawText: string;
  shorthand: string;
  quantity: number;
  catalogItemId: string | null;
  method: MatchMethod;
  confidence: number;
  status: LineStatus;
  candidates: Candidate[];
}
