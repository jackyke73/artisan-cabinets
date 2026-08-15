import * as XLSX from "xlsx";

export interface ParsedSheet {
  headers: string[];
  rows: Record<string, string>[];
}

/** Parse an uploaded .xlsx or .csv buffer into headers + row objects. */
export function parseSheet(buffer: Buffer): ParsedSheet {
  const wb = XLSX.read(buffer, { type: "buffer" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) return { headers: [], rows: [] };

  const matrix = XLSX.utils.sheet_to_json<(string | number)[]>(sheet, {
    header: 1,
    raw: false,
    defval: "",
    blankrows: false,
  });
  if (matrix.length === 0) return { headers: [], rows: [] };

  const headers = (matrix[0] as (string | number)[]).map((h) => String(h).trim());
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < matrix.length; i++) {
    const raw = matrix[i] as (string | number)[];
    if (!raw || raw.every((c) => String(c).trim() === "")) continue;
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = String(raw[idx] ?? "").trim();
    });
    rows.push(row);
  }
  return { headers, rows };
}

export type AppField = "sku" | "description" | "price" | "category" | "sizeCode" | "style";

const GUESS: Record<AppField, RegExp> = {
  sku: /\b(sku|code|item\s*#?|item\s*no|part)\b/i,
  description: /\b(desc|description|name|title|product)\b/i,
  price: /\b(price|cost|amount|list|msrp|unit\s*price)\b/i,
  category: /\b(categ|category|type|group|class)\b/i,
  sizeCode: /\b(size|size\s*code|dimension)\b/i,
  style: /\b(style|finish|line|series|door)\b/i,
};

/** Best-effort auto-mapping of app fields to spreadsheet columns. */
export function guessMapping(headers: string[]): Partial<Record<AppField, string>> {
  const mapping: Partial<Record<AppField, string>> = {};
  for (const field of Object.keys(GUESS) as AppField[]) {
    const hit = headers.find((h) => GUESS[field].test(h));
    if (hit) mapping[field] = hit;
  }
  return mapping;
}
