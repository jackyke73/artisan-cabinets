import { z } from "zod";
import { db } from "@/lib/db";
import { normalizeCode } from "@/lib/matching/normalize";
import { parsePriceToCents } from "@/lib/money";
import type { AppField } from "./parseSheet";

export type ColumnMapping = Partial<Record<AppField, string>>;

export interface ImportOptions {
  filename: string;
  mapping: ColumnMapping;
  rows: Record<string, string>[];
  deriveStyleFromSku: boolean;
  separator: string; // e.g. "-"
  mode: "merge" | "replace";
}

export interface ImportError {
  rowNumber: number;
  sku: string;
  reason: string;
}

export interface ImportSummary {
  batchId: string;
  rowCount: number;
  imported: number;
  skipped: number;
  errors: ImportError[];
  stylesCreated: string[];
}

const RowSchema = z.object({
  sku: z.string().trim().min(1, "missing SKU"),
  description: z.string().trim().min(1, "missing description"),
  priceCents: z.number().int().nonnegative(),
});

interface PreparedItem {
  sku: string;
  normalizedSku: string;
  description: string;
  priceCents: number;
  category: string | null;
  sizeCode: string | null;
  styleCode: string | null;
}

/** Validate + normalize rows against the column mapping (pure — no DB). */
export function prepareRows(opts: ImportOptions): { items: PreparedItem[]; errors: ImportError[] } {
  const { mapping, rows, deriveStyleFromSku, separator } = opts;
  const items: PreparedItem[] = [];
  const errors: ImportError[] = [];

  rows.forEach((row, i) => {
    const rowNumber = i + 2; // +1 for header, +1 for 1-based
    const skuRaw = mapping.sku ? row[mapping.sku] : "";
    const descRaw = mapping.description ? row[mapping.description] : "";
    const priceRaw = mapping.price ? row[mapping.price] : "";
    const priceCents = parsePriceToCents(priceRaw);

    const parsed = RowSchema.safeParse({
      sku: skuRaw ?? "",
      description: descRaw ?? "",
      priceCents: priceCents ?? NaN,
    });
    if (!parsed.success) {
      const reason =
        priceCents === null && (skuRaw ?? "").trim() !== ""
          ? `unreadable price "${priceRaw}"`
          : parsed.error.issues[0]?.message ?? "invalid row";
      errors.push({ rowNumber, sku: (skuRaw ?? "").trim(), reason });
      return;
    }

    const sku = parsed.data.sku;
    let styleCode: string | null = mapping.style ? row[mapping.style]?.trim() || null : null;
    let sizeCode: string | null = mapping.sizeCode ? row[mapping.sizeCode]?.trim() || null : null;

    if (deriveStyleFromSku && separator && sku.includes(separator)) {
      const idx = sku.indexOf(separator);
      styleCode = sku.slice(0, idx).trim();
      sizeCode = sku.slice(idx + separator.length).trim();
    }

    items.push({
      sku,
      normalizedSku: normalizeCode(sku),
      description: parsed.data.description,
      priceCents: parsed.data.priceCents,
      category: mapping.category ? row[mapping.category]?.trim() || null : null,
      sizeCode,
      styleCode,
    });
  });

  return { items, errors };
}

/** Validate, then commit the catalog import inside a transaction. */
export async function importRows(opts: ImportOptions): Promise<ImportSummary> {
  const { items, errors } = prepareRows(opts);

  const batch = await db.importBatch.create({
    data: {
      filename: opts.filename,
      rowCount: opts.rows.length,
      columnMappingJson: JSON.stringify(opts.mapping),
      status: "COMPLETED",
    },
  });

  const stylesCreated: string[] = [];

  // Resolve/create styles first so items can reference them.
  const styleIdByCode = new Map<string, string>();
  const uniqueStyleCodes = [...new Set(items.map((i) => i.styleCode).filter((c): c is string => !!c))];
  for (const code of uniqueStyleCodes) {
    const existing = await db.style.findUnique({ where: { code } });
    if (existing) {
      styleIdByCode.set(code, existing.id);
    } else {
      const created = await db.style.create({ data: { code, name: code } });
      styleIdByCode.set(code, created.id);
      stylesCreated.push(code);
    }
  }

  await db.$transaction(async (tx) => {
    if (opts.mode === "replace") {
      await tx.catalogItem.updateMany({ data: { active: false } });
    }
    for (const item of items) {
      const styleId = item.styleCode ? styleIdByCode.get(item.styleCode) ?? null : null;
      const data = {
        normalizedSku: item.normalizedSku,
        description: item.description,
        priceCents: item.priceCents,
        category: item.category,
        sizeCode: item.sizeCode,
        styleId,
        active: true,
        importBatchId: batch.id,
      };
      await tx.catalogItem.upsert({
        where: { sku: item.sku },
        create: { sku: item.sku, ...data },
        update: data,
      });
    }
  });

  await db.importBatch.update({
    where: { id: batch.id },
    data: { importedCount: items.length, skippedCount: errors.length },
  });

  return {
    batchId: batch.id,
    rowCount: opts.rows.length,
    imported: items.length,
    skipped: errors.length,
    errors,
    stylesCreated,
  };
}
