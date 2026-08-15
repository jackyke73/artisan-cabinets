import { NextResponse } from "next/server";
import { z } from "zod";
import { importRows } from "@/lib/catalog/importRows";

export const runtime = "nodejs";

const BodySchema = z.object({
  filename: z.string().default("catalog"),
  mapping: z.record(z.string(), z.string()),
  rows: z.array(z.record(z.string(), z.string())),
  deriveStyleFromSku: z.boolean().default(false),
  separator: z.string().default("-"),
  mode: z.enum(["merge", "replace"]).default("merge"),
});

export async function POST(req: Request) {
  const json = await req.json();
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid import payload." }, { status: 400 });
  }
  if (!parsed.data.mapping.sku || !parsed.data.mapping.description || !parsed.data.mapping.price) {
    return NextResponse.json({ error: "Map SKU, description, and price columns first." }, { status: 400 });
  }
  const summary = await importRows(parsed.data);
  return NextResponse.json(summary);
}
