import { NextResponse } from "next/server";
import { guessMapping, parseSheet } from "@/lib/catalog/parseSheet";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  try {
    const { headers, rows } = parseSheet(buffer);
    if (headers.length === 0) {
      return NextResponse.json({ error: "Could not read any columns from the file." }, { status: 400 });
    }
    return NextResponse.json({
      filename: file.name,
      headers,
      rows,
      rowCount: rows.length,
      guess: guessMapping(headers),
    });
  } catch {
    return NextResponse.json({ error: "Failed to parse the file. Is it a valid .xlsx or .csv?" }, { status: 400 });
  }
}
