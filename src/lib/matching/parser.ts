import type { ParsedLine } from "./types";

// A cabinet code token: letters, then digits, optionally a trailing letter or
// two (e.g. B15, A13, W3030, BD24L). Not anchored — extracted from a line.
const CODE_TOKEN = /[A-Za-z]{1,4}\d{1,4}(?:[A-Za-z]{1,2})?/;

// Quantity markers, tried in order against the raw line. Each returns [qty, matchToRemove].
const QTY_PATTERNS: RegExp[] = [
  /(?:^|\s)x\s*(\d+)\b/i, // "B15 x2", "B15 x 2"
  /×\s*(\d+)/, // "B15 ×2"
  /\((\d+)\)/, // "B15 (2)"
  /\bqty\.?\s*[:=]?\s*(\d+)/i, // "qty 2", "qty: 2"
  /^\s*(\d+)\s*x?\s+/i, // leading "2 B15", "2x B15"
];

function extractQuantity(line: string): { quantity: number; cleaned: string } {
  for (const pattern of QTY_PATTERNS) {
    const m = line.match(pattern);
    if (m && m[1]) {
      const qty = parseInt(m[1], 10);
      if (Number.isFinite(qty) && qty > 0) {
        return { quantity: qty, cleaned: line.replace(m[0], " ") };
      }
    }
  }
  return { quantity: 1, cleaned: line };
}

/** Parse one raw segment into a line item; returns null if no code token found. */
export function parseLine(rawText: string): ParsedLine | null {
  const trimmed = rawText.trim();
  if (!trimmed) return null;
  const { quantity, cleaned } = extractQuantity(trimmed);
  const codeMatch = cleaned.match(CODE_TOKEN);
  if (!codeMatch) return null;
  return { rawText: trimmed, shorthand: codeMatch[0], quantity };
}

/**
 * Parse a pasted customer request into line items. Splits on newlines,
 * semicolons, and commas. Segments with no recognizable code are dropped from
 * the auto-parse (the UI still lets staff add manual rows), never silently
 * turned into a wrong match.
 */
export function parseRequest(text: string): ParsedLine[] {
  const segments = text.split(/[\n;,]+/);
  const lines: ParsedLine[] = [];
  for (const seg of segments) {
    const parsed = parseLine(seg);
    if (parsed) lines.push(parsed);
  }
  return lines;
}
